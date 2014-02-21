var Utility  = require('./../modules/Utility.js'),
    User     = require('./../modules/User.js'),
    db       = require('./../modules/db.js');
    
var _        = require('underscore'),
    mongo    = require('mongodb-wrapper');

module.exports = {
    db: require('./staff/db.js'),
    info: require('./staff/info.js'),
    all:function(req, res) {
        // Filter the events/database and return the staff and shifts info (requires to decide on db structure)
        db.staff.find({}, function(err, data) {
            if (err || !data) {
                console.log(req.url);
                console.log(err);
            } else {
                res.json(data);
                res.end();
            }
        });
    },
    get: function(req, res) {
        // Filter the events/database and return the staff and shifts info (requires to decide on db structure)
        db.events.find({_id: new mongo.ObjectID(req.params.id)}, function(err, events) {
            if (err || !events) {
                console.log(req.url);
                console.log("No events found");
            } else {
                res.json(events[0].shifts);
                res.end();
            }
        });
    },
    add: function(req, res) { //post
        //req.url
        var chosenStaff = req.body.staff;
        if(cache.get('staffUsernameArray').indexOf(User.getUser(req)) === -1) { //if user is not in staff list, don't allow
            res.json(false);
            res.end();
            return false;
        }
        if(User.permission(req) < 10) {
            chosenStaff = User.getUser(req); //this will only add 
        }
        //console.log("Req for adding shift \"" + chosenStaff + "\" to Event ID " + req.body.eventid);
        var eventStart = new Date(Date.parse(req.body.eventStart)),
            eventEnd = new Date(Date.parse(req.body.eventEnd)),
            generatedID = new mongo.ObjectID(),
            startDate = new Date(Date.parse(eventStart.getFullYear() + "-" + (eventStart.getMonth()+1) + "-" + eventStart.getDate() + " " +req.body.start)),
            endDate = new Date(Date.parse(eventEnd.getFullYear() + "-" + (eventStart.getMonth()+1) + "-" + eventEnd.getDate() + " " +req.body.end)),
            newShift = {'id': generatedID, 'start': startDate,'end': endDate, 'staff': chosenStaff};
        db.events.findAndModify({
                            query: {_id: new mongo.ObjectID(req.body.eventid)},
                            update: { $addToSet: {'shifts': newShift} }, 
                            new: true
                        },
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Shift not added:" + err);
                } else {
                    //console.log("Shift added");
                    res.json({'id':generatedID.toString(),'start':startDate, 'end':endDate});
                    res.end();
                    if(chosenStaff === '') { return; }
                    Utility.sendSingleMail({
                        to: chosenStaff + '@wesleyan.edu',
                        subject:'You have a new shift! : ' + updated.title,
                        html: ejs.render(fs.readFileSync(__dirname + '/views/mail/newShift.ejs', 'utf8'), {'app': app, 'event': updated, 'shift': newShift})
                    });
                }
            });
    },
    remove: function(req, res) { //post
        var query = {'shifts': {'id': new mongo.ObjectID(req.body.id)} };
        if(User.permission(req) < 10) { //users other than the manager 
            query['shifts']['staff'] = User.getUser(req);
        }
        //console.log("Req for removing shift ID " + req.body.id + " from Event ID " + req.body.eventid);
        db.events.findAndModify({
                            query: {_id: new mongo.ObjectID(req.body.eventid)},
                            update: { $pull: query }, 
                            new: false //return the data before the update
                        },
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Shift not removed:" + err);
                } else {
                    //console.log("Shift removed");
                    res.json(true);
                    res.end();
                    //below is needed because id's are ObjectID, so we convert them to string to compare with req.body.id
                    updated.shifts = updated.shifts.map(function(shift) {
                        shift.id = shift.id + '';
                        return shift;
                    });
                    var oldShift = _.findWhere(updated.shifts, {'id': req.body.id});
                    if(_.isUndefined(oldShift)) {
                        console.log('old shift could not be found');
                        return false;
                    }

                    //store the removed shift somewhere, just in case someone deletes their shift just before the event or something
                    db.removedShifts.save(oldShift, function(err, saved) {
                                                if (err || !saved) {
                                                    console.log("Removed shift could not be added");
                                                }
                                            });

                    if(oldShift.staff === '') { return; }
                    Utility.sendSingleMail({
                        to: oldShift.staff + '@wesleyan.edu',
                        subject:'You have a removed shift! : ' + updated.title,
                        html: ejs.render(fs.readFileSync(__dirname + '/views/mail/removeShift.ejs', 'utf8'), {'app': app, 'event': updated, 'shift': oldShift})
                    });
                }
            });
    },
    shiftsignup: function(req, res) { //post
        //find the data to be updated (before update!)
        db.events.findOne({_id: new mongo.ObjectID(req.body.eventid)},
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Could not find after update:" + err);
                } else {
                    //below is needed because id's are ObjectID, so we convert them to string to compare with req.body.id
                    updated.shifts = updated.shifts.map(function(shift) {
                                                shift.id = shift.id + '';
                                                return shift;
                                            });
                    var signedUpShift = _.findWhere(updated.shifts, {'id': req.body.id});
                    if(_.isUndefined(signedUpShift)) {
                        console.log('the shift could not be found');
                        return false;
                    } else if(signedUpShift.staff !== '') {
                        console.log('someone is trying to sign up for a shift that already has a staff!');
                        return false;
                    }
                    //it is safe to update now
                    db.events.update({_id: new mongo.ObjectID(req.body.eventid), 'shifts.id': new mongo.ObjectID(req.body.id)},
                                     {$set: {'shifts.$.staff': User.getUser(req)}},
                                     function(err, ifUpdated) {
                                        if (err || !ifUpdated) {
                                            console.log(req.url);
                                            console.log("Shift not signed up:" + err);
                                        } else {
                                            res.json(true);
                                            res.end();
                                            
                                            //now send e-mails
                                            Utility.sendSingleMail({
                                                to: signedUpShift.staff + '@wesleyan.edu',
                                                subject:'You have a new shift! : ' + updated.title,
                                                html: ejs.render(fs.readFileSync(__dirname + '/views/mail/newShift.ejs', 'utf8'), {'app': app, 'event': updated, 'shift': signedUpShift})
                                            });
                                        }
                                    }); //end of update
                }
            });                
        //console.log("Req for signing up shift ID " + req.body.id + " from Event ID " + req.body.eventid);
    },
    withdraw: function(req, res) { //post
        //find the data to be updated (before update!)
        db.events.findOne({_id: new mongo.ObjectID(req.body.eventid)},
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Could not find after update:" + err);
                } else {
                    //below is needed because id's are ObjectID, so we convert them to string to compare with req.body.id
                    updated.shifts = updated.shifts.map(function(shift) {
                                                shift.id = shift.id + '';
                                                return shift;
                                            });
                    var withdrawnShift = _.findWhere(updated.shifts, {'id': req.body.id});
                    if(_.isUndefined(withdrawnShift)) {
                        console.log('the shift could not be found');
                        return false;
                    } else if(withdrawnShift.staff !== User.getUser(req)) {
                        console.log('someone is trying to withdraw for a shift that is not theirs!');
                        return false;
                    }
                    //it is safe to update now
                    db.events.update({_id: new mongo.ObjectID(req.body.eventid), 'shifts.id': new mongo.ObjectID(req.body.id)},
                                     {$set: {'shifts.$.staff': ''}},
                                     function(err, ifUpdated) {
                                        if (err || !ifUpdated) {
                                            console.log(req.url);
                                            console.log("Shift not withdrawn:" + err);
                                        } else {
                                            res.json(true);
                                            res.end();
                                            
                                            //now send e-mails
                                            Utility.sendSingleMail({
                                                to: withdrawnShift.staff + '@wesleyan.edu',
                                                subject:'You have a removed shift! : ' + updated.title,
                                                html: ejs.render(fs.readFileSync(__dirname + '/views/mail/removeShift.ejs', 'utf8'), {'app': app, 'event': updated, 'shift': withdrawnShift})
                                            });
                                            //store the removed shift somewhere, just in case someone deletes their shift just before the event or something
                                                db.removedShifts.save(withdrawnShift, function(err, saved) {
                                                        if (err || !saved) {
                                                            console.log("Removed shift could not be added");
                                                        }
                                                    });
                                        }
                                    }); //end of update
                }
            });                
        //console.log("Req for withdrawing shift ID " + req.body.id + " from Event ID " + req.body.eventid);
    }
}