var Utility  = require('./../../modules/Utility.js'),
    User     = require('./../../modules/user.js'),
    db       = require('./../../modules/db.js');
    
var _        = require('underscore'),
    mongo    = require('mongojs'),
    cache    = require('memory-cache');

module.exports = {
    availableToday: function(req, res) {
        //this is determined by staff time checking, not shift time checking, therefore if 
        var busyStaff = [];
        //86400s = 1d
        var start = new Date(req.query.start * 1000),
            end = new Date(req.query.end * 1000);
        //console.log("Req for staff available starting at " + start.toDateString() + " and ending before " + end.toDateString());
        var query = {'start': {$gte: start, $lt: end}};
        db.events.find(query, function(err, events) {
            if (err || !events) {
                console.log(req.url);
                console.log("No events found");
            } else {
                events.forEach(function(event) {
                    event.shifts.forEach(function(shift) {
                        busyStaff.push(shift.staff);
                    });
                });
                var availableStaff = _.difference(cache.get('staffUsernameArray'), busyStaff);
                res.json(availableStaff);
            }    
        });
    },
    check: function(req, res) {
        User.permissionControl(req, res, 10);

        var start = new Date(Date.parse(req.query.start)),
            end = new Date(Date.parse(req.query.end));
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        //console.log(start);
        //console.log("Req for staff check for " + req.query.user);
        db.events.find({'start': {$gte: start, $lt: end}, 'shifts':{$elemMatch: {'staff': req.query.user}},}, function(err, events) {
            if (err || !events) {
                console.log(req.url);
                console.log("No events found" + err);
                res.json(false);
            } else {
                res.json(events);
            }
        });
    },
    table: function(req, res) {
        User.permissionControl(req, res, 10);

        var start = new Date(Date.parse(req.query.start)),
            end = new Date(Date.parse(req.query.end));
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        //console.log(start);
        //console.log("Req for staff table for " + req.query.user);
        db.events.find({'start': {$gte: start, $lt: end},}, function(err, events) {
            if (err || !events) {
                console.log(req.url);
                console.log("No events found" + err);
                res.json(false);
            } else {
                var result = {};
                events.forEach(function(event) {
                    event.shifts.forEach(function(shift) {
                        if (shift.staff === "") {
                            return;
                        } else {
                            shift.staff = shift.staff.toLowerCase();
                        }
                        result[shift.staff] = (typeof result[shift.staff] === 'undefined') ? {} : result[shift.staff];
                        result[shift.staff].hour = (typeof result[shift.staff].hour === 'undefined') ? 0 : result[shift.staff].hour;
                        result[shift.staff].event = (typeof result[shift.staff].event === 'undefined') ? 0 : result[shift.staff].event;
                        result[shift.staff].event += 1;
                        result[shift.staff].hour += ((Date.parse(shift.end) - Date.parse(shift.start)) / 3600000);
                    });
                });
                res.json(result);
            }
        });
    },
    staffCheck: function(req, res) {
        User.permissionControl(req, res, 10);
        res.render('staffCheck', {app: req.app, cache: cache});
    },
    staffTable: function(req, res) {
        User.permissionControl(req, res, 10);
        res.render('staffTable', {app: req.app});
    }
};
