var Utility     = require('./../modules/Utility.js'),
    User        = require('./../modules/user.js'),
    db          = require('./../modules/db.js'),
    Preferences = require('./../config/Preferences.js');
    
var _        = require('underscore'),
    $        = require('jquery'),
    cache    = require('memory-cache'),
    mongo    = require('mongodb-wrapper');

module.exports = {
    m: function (req, res) {
        if(req.query.ticket) {res.redirect(Preferences.path_on_server + 'm/');} //redirect to the base if there is a ticket in the URL
        res.redirect(Preferences.path_on_server + 'm/0/');
    },
    mWithCounter: function (req, res) {
        var today = new Date();
        today.setHours(0,0,0,0);
        var start = new Date(today.getTime() + 24 * 60 * 60 * 1000 * req.params.counter),
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        
        var title = '';
        req.params.counter = parseInt(req.params.counter);
        if (req.params.counter === 0) {
            title = 'Today';
        } else if (req.params.counter === -1) {
            title = 'Yesterday';
        } else if(req.params.counter === 1) {
            title = 'Tomorrow';
        } else {
            title = req.app.locals.getFormattedDate(start);
        }
        query = {};
        $.extend(query, {'start': {$gte: start, $lt: end}});
        db.events.find(query, function(err, events) {
            if (err || !events) {
                console.log(req.url);
                console.log("No events found" + err);
            } else {
                
                res.render('mobile/index', {
                    username: User.getUser(req),
                    permission: User.permission(req),
                    events: events,
                    counter: req.params.counter,
                    title:title,
                });
            }
        });    
    },
    event: function (req, res) {
        query = {};
        $.extend(query, {'_id': new mongo.ObjectID(req.params.id)});
        db.events.find(query, function(err, events) {
            if (err || !events) {
                console.log(req.url);
                console.log("No events found" + err);
            } else {
                res.render('mobile/event', {
                    username: User.getUser(req),
                    permission: User.permission(req),
                    event: events[0],
                });
            }
        });    
    },
    staff: function (req, res) {
        var userObj = $.grep(cache.get('storeStaff'), function(e){ return e.username == req.params.username; });
        if(userObj.length != 1) {
            res.end();
            return false;
        }
        res.render('mobile/staff', {
            username: User.getUser(req),
            permission: User.permission(req),
            staff: userObj[0],
        });
    }
};