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
};
