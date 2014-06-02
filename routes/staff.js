var Utility  = require('./../modules/Utility.js'),
    User     = require('./../modules/user.js'),
    db       = require('./../modules/db.js');
    
var _        = require('underscore'),
    fs       = require('fs'),
    mongo    = require('mongojs'),
    cache    = require('memory-cache');

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
            }
        });
    },
    get: function(req, res) {
        // Filter the events/database and return the staff and shifts info (requires to decide on db structure)
        db.events.find({_id: mongo.ObjectId(req.params.id)}, function(err, events) {
            if (err || !events) {
                console.log(req.url);
                console.log("No events found");
            } else {
                res.json(events[0].shifts);
            }
        });
    },
    add: function(req, res) { //post
        
        var chosenStaff = req.body.staff;
        if(cache.get('staffUsernameArray').indexOf(User.getUser(req)) === -1) { //if user is not in staff list, don't allow
            res.json(false);
            return false;
        }
        if(User.permission(req) < 10) {
            chosenStaff = User.getUser(req); //this will only add 
        }
        //console.log("Req for adding shift \"" + chosenStaff + "\" to Event ID " + req.body.eventid);
        var eventStart = new Date(Date.parse(req.body.eventStart)),
            eventEnd = new Date(Date.parse(req.body.eventEnd)),
            generatedID = mongo.ObjectId(),
            startDate = new Date(Date.parse(eventStart.getFullYear() + "-" + (eventStart.getMonth()+1) + "-" + eventStart.getDate() + " " +req.body.start)),
            endDate = new Date(Date.parse(eventEnd.getFullYear() + "-" + (eventStart.getMonth()+1) + "-" + eventEnd.getDate() + " " +req.body.end)),
            newShift = {'id': generatedID, 'start': startDate,'end': endDate, 'staff': chosenStaff};
        db.events.findAndModify({
                            query: {_id: mongo.ObjectId(req.body.eventid)},
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
                    if(chosenStaff === '') { return; }
                    Utility.sendSingleMail({
                        to: chosenStaff + '@wesleyan.edu',
                        subject:'You have a new shift! : ' + updated.title,
                        html: ejs.render(fs.readFileSync(__dirname + '/../views/mail/newShift.ejs', 'utf8'), {'app': req.app, 'event': updated, 'shift': newShift})
                    });
                }
            });
    },
    remove: function(req, res) { //post
        var query = {'shifts': {'id': mongo.ObjectId(req.body.id)} };
        if(User.permission(req) < 10) { //users other than the manager 
            query.shifts.staff = User.getUser(req);
        }
        //console.log("Req for removing shift ID " + req.body.id + " from Event ID " + req.body.eventid);
        db.events.findAndModify({
                            query: {_id: mongo.ObjectId(req.body.eventid)},
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
                        html: ejs.render(fs.readFileSync(__dirname + '/../views/mail/removeShift.ejs', 'utf8'), {'app': req.app, 'event': updated, 'shift': oldShift})
                    });
                }
            });
    },
    shiftsignup: function(req, res) { //post
        //find the data to be updated (before update!)
        db.events.findOne({_id: mongo.ObjectId(req.body.eventid)},
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
                    db.events.update({_id: mongo.ObjectId(req.body.eventid), 'shifts.id': mongo.ObjectId(req.body.id)},
                                     {$set: {'shifts.$.staff': User.getUser(req)}},
                                     function(err, ifUpdated) {
                                        if (err || !ifUpdated) {
                                            console.log(req.url);
                                            console.log("Shift not signed up:" + err);
                                        } else {
                                            res.json(true);
                                            
                                            //now send e-mails
                                            Utility.sendSingleMail({
                                                to: signedUpShift.staff + '@wesleyan.edu',
                                                subject:'You have a new shift! : ' + updated.title,
                                                html: ejs.render(fs.readFileSync(__dirname + '/../views/mail/newShift.ejs', 'utf8'), {'app': req.app, 'event': updated, 'shift': signedUpShift})
                                            });
                                        }
                                    }); //end of update
                }
            });                
        //console.log("Req for signing up shift ID " + req.body.id + " from Event ID " + req.body.eventid);
    },
    withdraw: function(req, res) { //post
        //find the data to be updated (before update!)
        db.events.findOne({_id: mongo.ObjectId(req.body.eventid)},
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
                    db.events.update({_id: mongo.ObjectId(req.body.eventid), 'shifts.id': mongo.ObjectId(req.body.id)},
                                     {$set: {'shifts.$.staff': ''}},
                                     function(err, ifUpdated) {
                                        if (err || !ifUpdated) {
                                            console.log(req.url);
                                            console.log("Shift not withdrawn:" + err);
                                        } else {
                                            res.json(true);
                                            
                                            //now send e-mails
                                            Utility.sendSingleMail({
                                                to: withdrawnShift.staff + '@wesleyan.edu',
                                                subject:'You have a removed shift! : ' + updated.title,
                                                html: ejs.render(fs.readFileSync(__dirname + '/../views/mail/removeShift.ejs', 'utf8'), {'app': req.app, 'event': updated, 'shift': withdrawnShift})
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
    },
    confirm: function(req, res) { //GET
        db.events.update(
            {'shifts.id': mongo.ObjectId(req.params.id)},
            {$set: {'shifts.$.confirmed': true}}, 
            function(err, updated) {
                if(err || !updated) {
                    console.log('Shift could not be confirmed.');
                    return;
                }
                //show a page
                res.send("<h2>Your shift is confirmed!</h2>");
            });
    },
    cover: function(req, res) { //POST
        if(User.permission(req) < 10) { //users other than the manager 
            res.json(false);
            return;
        }

        db.events.update({}, {}, function() {
            db.events.update(
                {'shifts.id': mongo.ObjectId(req.body.id)},
                {$set: {'shifts.$.cover': JSON.parse(req.body.set)}}, 
                function(err, updated) {
                    if(err || !updated) {
                        res.json(false);
                        return;
                    }
                    res.json(true);
                });
        });
    }
};
