var _          = require('underscore'),
    fs         = require('fs');
    async      = require('async'),
    ejs        = require('ejs');
    
//var cache = require('memory-cache');

var Preferences = require('./../config/Preferences.js'),
    Utility     = require('./../modules/Utility.js'),
    User        = require('./../modules/user.js'),
    db          = require('./../modules/db.js'),
    autoAssign  = require('./../modules/autoAssign.js');

module.exports = {
    get: function(req, res) {
        User.permissionControl(req, res, 10);

        var lastInfo = ['',''];
        try {
            var readFile = fs.readFileSync(__dirname + Preferences.path_last_upload_info); //see the last upload time & user
            lastInfo = readFile.toString().split('&');
        } catch(e) {}
         res.render('upload', {lastUploadTime: lastInfo[0], lastUploadUser: lastInfo[1]});
    },
    post: function(req, res) {
        User.permissionControl(req, res, 10);

        var today, twoWeeksLater;
        today = new Date();
        today.setHours(0,0,0,0);
        twoWeeksLater = new Date((new Date()).getTime() + 2 * 7 * 24 * 60 * 60 * 1000);
        twoWeeksLater.setHours(23,59,59,999);

        db.events.find({'start': {$gte: today, $lt: twoWeeksLater}}, function(err, events) {
            if (err || !events) {
                console.log(req.url);
                console.log("No events found" + err);
            } else {
                // events loaded. let's check for every event

                    var parser = require('xml2json');
                    console.log('Upload and saving progress started');
                    //you should check if it's an xml file
                    try {
                        // Freshly uploaded XML and last.xml are read
                            var xml = fs.readFileSync(req.files.myFile.path),
                                last = fs.readFileSync(__dirname + Preferences.path_last_xml);
                        // Both XML files are parsed
                            xml = parser.toJson(xml, {
                                object: true,
                                trim: true,
                                arrayNotation: true
                            }).CopyofIMSforExport.Data;
                            last = parser.toJson(last, {
                                object: true,
                                trim: true,
                                arrayNotation: true
                            }).CopyofIMSforExport.Data;
                            if(last === "0" || last === 0) {last = [];} //this is only for the first setup of spec on any machine

                        var whatToChange = { update: [], add: [], remove: events };
                        console.log(xml.length + ' events in the new XML file');
                        console.log(last.length + ' events in the last XML file');
                        // Parsed XML files are compared according to their unique ID's, event by event
                        xml.forEach(function(xmlEntry) {
                            //try to find an object with the same unique ID
                            var entryInLast = _.findWhere(last, {
                                'Service_x0020_Order_x0020_Detail_x0020_ID': xmlEntry.Service_x0020_Order_x0020_Detail_x0020_ID
                            });
                            if (!_.isUndefined(entryInLast)) { //if exists, then compare if they are the same
                                if(!_.isEqual(xmlEntry, entryInLast)) {
                                    whatToChange.update.push(xmlEntry); //if they are the same, store to update later
                                }
                            } else { //if it doesn't exist in the last.xml, then store it to add later.
                                whatToChange.add.push(xmlEntry);
                            }
                            /*
                            find the event with the same XMLid, delete that event from the array
                            the remaining events are apparently deleted from EMS
                            */
                            whatToChange.remove = _.reject(whatToChange.remove, function(el) { return el.XMLid === xmlEntry.Service_x0020_Order_x0020_Detail_x0020_ID; });
                        });
                        //should write a part that distinguishes new events and updated events.
                        var process = function(data) {
                            var bookingDate = data.Booking_x0020_Date.split(" ")[0],
                                reservedStart = new Date(Date.parse(bookingDate + ' ' + data.Reserved_x0020_Start)),
                                reservedEnd = new Date(Date.parse(bookingDate + ' ' + data.Reserved_x0020_End)),
                                eventStart = new Date(Date.parse(bookingDate + ' ' + data.Event_x0020_Start)),
                                eventEnd = new Date(Date.parse(bookingDate + ' ' + data.Event_x0020_End)),
                                desc;
                                
                            if(data.Category === 'A/V Services') {
                                desc = data.Resource;
                            } else {
                                desc = data.Notes;
                            }
                            
                            if(_.isObject(desc)) {desc = '';} //if it's an object rather than a string, make it a blank string

                            var cancelled = false;
                            if (data.Booking_x0020_Status == 'Cancelled') {
                                cancelled = true;
                            }
                            var video = false;
                            ['video','recording'].forEach(function(word) {
                                if(String(data.Notes).indexOf(word) != -1) {
                                    video = true;
                                }
                            });
                            return {
                                XMLid: data.Service_x0020_Order_x0020_Detail_x0020_ID,
                                title: req.app.locals.fixParantheses(data.Event_x0020_Name),
                                desc:  req.app.locals.fixParantheses(desc),
                                loc:   req.app.locals.fixParantheses(data.Room_x0020_Description),
                                start: reservedStart,
                                end:   reservedEnd,
                                'eventStart': eventStart,
                                'eventEnd':   eventEnd,
                                'cancelled':  cancelled,
                                techMustStay: true,
                                'audio': false,
                                'video':  video,
                                customer: {
                                    'name':  req.app.locals.fixParantheses(data.Customer),
                                    'phone': data.Customer_x0020_Phone_x0020_1,
                                }
                            };
                        };

                        var cleanSheet = function(data) { //these are for the new events to be added.
                            data.inventory = [];
                            data.notes = [];
                            data.shifts = [];
                            data.staffNeeded = 1;
                            return data;
                        };

                        whatToChange.update = whatToChange.update.map(process);
                        whatToChange.add = whatToChange.add.map(process).map(cleanSheet).map(autoAssign);

                        var changeNumbers = {add:0, update:0, remove: 0},
                            parallel = [],
                            whatToReport = {update:[], remove: whatToChange.remove};
                        //push update functions in an array, in order to have a final callback function to end response after the async.parallel process
                        whatToChange.add.forEach(function(event) { 
                            parallel.push(function(callback) {
                                                    db.events.save(event, function(err, saved) {
                                                        if (err || !saved) {
                                                            console.log("New event is not saved");
                                                        } else {
                                                            changeNumbers.add++;
                                                            callback();
                                                        }
                                                    });
                                                });
                        });

                        whatToChange.update.forEach(function(event) {
                            parallel.push(function(callback) {
                                                    db.events.findAndModify({
                                                        query: {XMLid: event.XMLid},
                                                        update: {$set: event }, 
                                                        new: true
                                                    },
                                                    function(err, updated) {
                                                        if (err || !updated) {
                                                            console.log("Event could not be updated: " + err);
                                                            console.log(event.title);
                                                        } else {
                                                            changeNumbers.update++;
                                                            whatToReport.update.push(updated);
                                                            callback();
                                                        }
                                                    });
                                                });
                        });

                        whatToChange.remove.forEach(function(event) { //events removed from EMS detected, now delete them from db
                            parallel.push(function(callback) {
                                                    db.events.remove(
                                                        {XMLid: event.XMLid},
                                                        function(err, removed) {
                                                            if (err || !removed) {
                                                                console.log("Event could not be removed:" + err);
                                                                console.log(event.title);
                                                            } else {
                                                                changeNumbers.remove++;
                                                                callback();
                                                            }
                                                        });
                                                });
                        });


                        async.parallel(parallel, function() {
                            console.log("Upload and saving progress ended successfully");
                            res.writeHead(200);
                            res.write(changeNumbers.add + ' events added, ' + changeNumbers.update + ' updated and ' + changeNumbers.remove + ' removed, upload and saving progress ended successfully.');
                            res.end();
                            // delete the old last.xml file and rename the new uploaded file as last.xml
                            (function(path) {
                                fs.unlink(__dirname + Preferences.path_last_xml, function(err) {
                                    if (err) {
                                        console.log(err);
                                        return false;
                                    }
                                    console.log('Old last.xml file successfully deleted');
                                    fs.rename(path, __dirname + Preferences.path_last_xml, function(err) {
                                        if (err) throw err;
                                        console.log('Uploaded file renamed to last.xml');
                                    });
                                });
                            })(req.files.myFile.path);
                            reportUpdate(whatToReport, req); //send messages to the staff and managers
                            fs.writeFileSync(__dirname + Preferences.path_last_upload_info, (new Date() + '&' + User.getUser(req))); //store the last upload time & user
                        });
                    } catch (err) {
                        // delete the newly uploaded file because there is no need to store it
                        if(!_.isUndefined(req.files)) { //if there is actually a file, then delete it
                            (function(path) {
                                console.log(path);
                                fs.unlink(path, function(err) {
                                    if (err) {
                                        console.log(err);
                                        return false;
                                    }
                                    console.log('File with error successfully deleted');
                                });
                            })(req.files.myFile.path);
                        } else {
                            console.log('There is no file uploaded.');
                        }
                        console.log(err);
                        //res.writeHead(400);
                        res.end();
                        return false;
                    }

                // first db query and if else, and other functions end
            }
        });        
    }
};


//this will send messages to the managers and the people who are registered in those events
//gonna be hoisted
function reportUpdate(whatToReport, req) {
    if(whatToReport.update.length < 1 && whatToReport.remove.length < 1) {return false;} //don't send any mail if there is no change
    //not using a function for e-mail sending because we need to close the connection after all stuff

    // create reusable transport method (opens pool of SMTP connections)
    var smtpTransport = Utility.smtpTransport();
    //we have an object {update:[], remove:[]}, and the update array has the these events
    var whatToSend = {},
        parallel = [];
    whatToReport.update.forEach(function(event) {
        parallel.push(function(callback) {
            event.shifts.forEach(function(shift) {
                if(_.isUndefined(whatToSend[shift.staff])) { whatToSend[shift.staff] = {remove:[], update:[]}; }
                whatToSend[shift.staff].update.push({'event': event, 'shift': shift}); //this is the structure of the array elements, be careful
            });
            callback();
        });
    });
    whatToReport.remove.forEach(function(event) {
        parallel.push(function(callback) {
            event.shifts.forEach(function(shift) {
                if(_.isUndefined(whatToSend[shift.staff])) { whatToSend[shift.staff] = {remove:[], update:[]}; }
                whatToSend[shift.staff].remove.push({'event': event, 'shift': shift}); //this is the structure of the array elements, be careful
            });
            callback();
        });
    });
    async.parallel(parallel, function() {
        //now we have a complete whatToSend object, so we can start to send notifications

        _.each(whatToSend, function(items, user) {
            var staffMailOptions = {
                from: Preferences.mail.fromString,
                to: user + "@wesleyan.edu",
                subject: "Updated Event for " + user + " (IMPORTANT)",
            };

            staffMailOptions.html = ejs.render(fs.readFileSync(__dirname + '/../views/mail/normalUpdate.ejs', 'utf8'), {'app': req.app, 'items': items});

            smtpTransport.sendMail(staffMailOptions, function(error, response) {
                if (error) {
                    console.log(error);
                } else {
                    //console.log("Message sent: " + response.message);
                }
            });
        });
        
    }); //end of async.parallel

    //now it's time to report all updates to the managers (all staff with level 10), with whatToReport
        
        //var managerList = _.where(cache.get('storeStaff'), {level:10});
        var managerList = Preferences.managerEmails;

            managerMailOptions = {
                    from: Preferences.mail.fromString,
                    subject: "General Event Update Report (IMPORTANT)",
                };

        managerMailOptions.html = ejs.render(fs.readFileSync(__dirname + '/../views/mail/managerUpdate.ejs', 'utf8'), {'app': req.app, 'items': whatToReport});
        managerList.forEach(function (manager) {
            managerMailOptions.to = manager.username + "@wesleyan.edu";
            smtpTransport.sendMail(managerMailOptions, function(error, response) {
                    if (error) {
                        console.log(error);
                    } else {
                        //console.log("Message sent: " + response.message);
                    }
                });
        });

    //smtpTransport.close(); //this should wait for the callbacks to end
} //end of reportUpdate
