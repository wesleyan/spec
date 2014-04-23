var Preferences = require('./../config/Preferences.js');

var Utility   = require('./../modules/Utility.js'),
    User      = require('./../modules/user.js'),
    db        = require('./../modules/db.js');
    
var fs         = require('fs'),
    _          = require('underscore'),
    $          = require('jquery'),
    mongo      = require('mongodb-wrapper');

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
        $.extend(query, {'start': {$gte: start, $lt: end}});
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
                events = Utility.addBackgroundColor(events);
                res.json(events);
            }
        });
        //console.log("Req for events starting at " + start.toDateString() + " and ending before " + end.toDateString());    
    },
    techMustStay: function(req, res) { //post
        User.permissionControl(req, res, 10);

        
        //console.log("Req for techMustStay toggle Event ID " + req.body.eventid);
        db.events.update(
            {_id: new mongo.ObjectID(req.body.eventid)},
            { $set: {'techMustStay': JSON.parse(req.body.make) } }, 
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Event not techMustStay toggled:" + err);
                } else {
                    //console.log("Event techMustStay toggled");
                    res.json(true);
                }
            });
    },
    video: function(req, res) { //post
        
        User.permissionControl(req, res, 10);

        //console.log("Req for techMustStay toggle Event ID " + req.body.eventid);
        db.events.update(
            {_id: new mongo.ObjectID(req.body.eventid)},
            { $set: {'video': JSON.parse(req.body.make) } }, 
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Event not video toggled:" + err);
                } else {
                    //console.log("Event video toggled");
                    res.json(true);
                }
            });
    },
    audio: function(req, res) { //post
        
        User.permissionControl(req, res, 10);

        db.events.update(
            {_id: new mongo.ObjectID(req.body.eventid)},
            { $set: {'audio': JSON.parse(req.body.make) } }, 
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Event not audio toggled:" + err);
                } else {
                    //console.log("Event audio toggled");
                    res.json(true);
                }
            });
    },
    edit: function(req, res) { //post
        
        User.permissionControl(req, res, 10);

        //console.log("Req for event edit Event ID " + req.body.eventid);
        var query = {updated:true};
        $.each(req.body.changedData, function(key, value) {
            if(key == 'title' || key == 'desc' || key == 'loc') {
                query[key] = value;
            }
        });
        var reqDate = new Date(Date.parse(req.body.changedData.date));
        reqDate = (reqDate.getMonth() + 1) + '/' + reqDate.getDate() + '/' +  reqDate.getFullYear() + ' ';
        query.start = new Date(Date.parse(reqDate + req.body.changedData.timepickerResStart));
        query.end = new Date(Date.parse(reqDate + req.body.changedData.timepickerResEnd));
        query.eventStart = new Date(Date.parse(reqDate + req.body.changedData.timepickerEventStart));
        query.eventEnd = new Date(Date.parse(reqDate + req.body.changedData.timepickerEventEnd));
        query.staffNeeded = parseInt(req.body.changedData.staffNeeded);
        db.events.findAndModify(
            {
                query: {_id: new mongo.ObjectID(req.body.eventid)},
                update: { $set: query }, 
                new: true
            },
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Event not edited:" + err);
                } else {
                    //console.log("Event edited");
                    res.json(true);

                    //Send e-mails to the registered staff after update
                    var smtpTransport = Utility.smtpTransport();

                    updated.shifts.forEach(function(shift) {
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
            });
    },
    spinner: function(req, res) { //post
        
        User.permissionControl(req, res, 10);

        //console.log("Req for staffNeeded spinner for Event ID " + req.body.eventid);
        db.events.update(
            {_id: new mongo.ObjectID(req.body.eventid)},
            { $set: {'staffNeeded': parseInt(req.body.make) } }, 
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Event staffNeeded not changed:" + err);
                } else {
                    //console.log("Event staffNeeded changed");
                    res.json(true);
                }
            });
    },
    cancel: function(req, res) { //post
        
        User.permissionControl(req, res, 10);

        //console.log("Req for cancel toggle Event ID " + req.body.eventid);
        db.events.update(
            {_id: new mongo.ObjectID(req.body.eventid)},
            { $set: {'cancelled': JSON.parse(req.body.make) } }, 
            function(err, updated) {
                if (err || !updated) {
                    console.log(req.url);
                    console.log("Event not cancel toggled:" + err);
                } else {
                    //console.log("Event cancel toggled");
                    res.json(true);
                }
            });
    },
    remove: function(req, res) { //post
        
        User.permissionControl(req, res, 10);

        //console.log("Req for remove Event ID " + req.body.eventid);
        db.events.remove(
            {_id: new mongo.ObjectID(req.body.eventid)},
            function(err, removed) {
                if (err || !removed) {
                    console.log(req.url);
                    console.log("Event not removed:" + err);
                } else {
                    //console.log("Event removed");
                    res.json(true);
                }
            });
    }
};