var Preferences = require('./../config/Preferences.js');

var Utility = require('./../modules/Utility.js'),
    User    = require('./../modules/user.js'),
    db      = require('./../modules/db.js');

var fs      = require('fs'),
    _       = require('underscore'),
    mongo   = require('mongojs');

module.exports = {
    events: function(req, res) {
        //86400s = 1d
        var start = new Date(req.query.start * 1000),
            end = new Date(req.query.end * 1000),
            query = {};
        switch(req.query.filter) {
            case 'all':
                query = {};
                break;
            case 'hideCancelled':
                query = {cancelled: false};
                break;
            case 'unstaffed':
                query = {cancelled: false };
                break;
            case 'onlyMine':
                query = {shifts: { $elemMatch: { staff: User.getUser(req) } }};
                break;
            case 'recentVideo':
                query = {video: true};
                break;
            default:
                query = {};
        }
        query = _.extend(query, {'start': {$gte: start, $lt: end}});
        db.events.find(query, function(err, events) {
            if (err || !events) {
                console.log(req.url);
                console.log("No events found:" + err);
            } else {
                if(req.query.filter === 'unstaffed') {
                    //filter them manually because empty shifts seem like real shifts
                    events = _.filter(events, function (event) {
                        return Utility.fullShiftNumber(event) < event.staffNeeded;
                    });
                }
                res.json(events);
            }
        });
        //console.log("Req for events starting at " + start.toDateString() + " and ending before " + end.toDateString());
    },
    patch: function(req, res) {
        var query = req.body;

        //eventEdited = true, if the event was actually edited except regular stuff
        var eventEdited = !_.isEmpty(_.difference(_.keys(query), ['shifts', 'notes', 'inventory', 'staffNeeded']));

        if (!_.isEmpty(_.difference(_.keys(query), ['shifts', 'notes', 'inventory'])) && User.permission(req) < 10) {
            res.status(400).json({
                ok: false
            });
            return false;
        }

        if (_.has(query, "shifts")) {
            query.shifts = query.shifts.map(function(shift) {
                if (!_.has(shift, "id")) {
                    shift.id = mongo.ObjectId();
                } else {
                    shift.id = mongo.ObjectId(shift.id);
                }
                shift.start = new Date(shift.start);
                shift.end   = new Date(shift.end);
                return shift;
            });
        }
        if (_.has(query, "notes")) {
            query.notes = query.notes.map(function(note) {
                if (!_.has(note, "id")) {
                    note.id = mongo.ObjectId();
                } else {
                    note.id = mongo.ObjectId(note.id);
                }
                return note;
            });
        }

        if (_.has(query, "start")) {
            query.start = new Date(query.start);
        }
        if (_.has(query, "end")) {
            query.end = new Date(query.end);
        }
        if (_.has(query, "eventStart")) {
            query.eventStart = new Date(query.eventStart);
        }
        if (_.has(query, "eventEnd")) {
            query.eventEnd = new Date(query.eventEnd);
        }

        if(eventEdited) {
          query.updated = true;
        }

        db.events.findAndModify({
              query: {_id: mongo.ObjectId(req.params.id)},
              update:{$set: query}
            }, function(err, updated) {
                if (err || !updated) {
                    return;
                }
                res.json(query);

                var previous = _.clone(updated);
                updated = _.extend(updated, query);

                //Send notifications
                if (_.has(query, "shifts")) {
                    //Check for new shifts
                    var added = [];
                    if(previous.shifts.length < updated.shifts.length) {
                      added = _.difference(updated.shifts, previous.shifts);
                    }

                    //Check for removed shifts
                    var removed = [];
                    if(previous.shifts.length > updated.shifts.length) {
                      removed = _.difference(previous.shifts, updated.shifts);
                    }

                    var signedUp  = [],
                        withdrawn = [];

                    try {
                        if(previous.shifts.length === updated.shifts.length) {
                          //Check for shifts signed up
                          signedUp = previous.shifts.filter(function(shift) {
                            return shift.staff === '';
                          }).map(function(shift) {
                            var newer = _.findWhere(updated.shifts.map(function(x) {x.id = x.id.toString(); return x;}), {id: shift.id.toString()});

                            if(_.isUndefined(newer)) {
                              throw new Error('Shift should be found if the same shifts.length');
                            }
                            return newer;
                          });

                          //Check for shifts withdrawn
                          withdrawn = updated.shifts.filter(function(shift) {
                            return shift.staff === '';
                          }).map(function(shift) {
                            var older = _.findWhere(previous.shifts.map(function(x) {x.id = x.id.toString(); return x;}), {id: shift.id.toString()});

                            if(_.isUndefined(older)) {
                              throw new Error('Shift should be found if the same shifts.length');
                            }
                            return older;
                          });
                        }
                    } catch(e) {
                      console.error(e);
                    }

                    var newShifts     = added.concat(signedUp),
                        removedShifts = removed.concat(withdrawn);

                    newShifts.forEach(function(shift) {
                        Utility.sendSingleMail({
                            to: shift.staff + '@wesleyan.edu',
                            subject:'You have a new shift! : ' + updated.title,
                            html: ejs.render(fs.readFileSync(__dirname + '/../views/mail/newShift.ejs', 'utf8'), {'app': req.app, 'event': updated, 'shift': shift})
                        });
                    });
                    removedShifts.forEach(function(shift) {
                        Utility.sendSingleMail({
                            to: shift.staff + '@wesleyan.edu',
                            subject:'You have a removed shift! : ' + updated.title,
                            html: ejs.render(fs.readFileSync(__dirname + '/../views/mail/removeShift.ejs', 'utf8'), {'app': req.app, 'event': updated, 'shift': shift})
                        });
                    });
                }

                // Handle notifications for the existing staff of edited events
                if(eventEdited) {
                    //Send e-mails to the registered staff after update
                    var smtpTransport = Utility.smtpTransport();

                    updated.shifts.forEach(function(shift) {
                        if(shift.staff === '') {
                            return false;
                        }

                        var staffMailOptions = {
                            from: Preferences.mail.fromString,
                            to: shift.staff + "@wesleyan.edu",
                            subject: "Updated Event for " + shift.staff + " (IMPORTANT)",
                        };
                        var items = {
                            'update': [{
                                'event': updated,
                                'shift': _.findWhere(updated.shifts, {
                                    staff: shift.staff
                                })
                            }],
                            remove: []
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
                    //e-mails sent
                }
                //end of eventEdited
            });
    },
    delete: function(req, res) {
        if(User.permission(req) < 10) {
            res.status(400).json({ok: false});
            return;
        }
        db.events.remove({_id: mongo.ObjectId(req.params.id)}, function(err, removed) {
            if(err || !removed) {
              res.status(400).json({ok: false});
              return;
            }
            res.json({ok: true});
          });
    }
};
