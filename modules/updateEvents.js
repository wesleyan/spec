var Preferences = require('./../config/Preferences.js');

var Utility = require('./Utility.js'),
    db      = require('./db.js'),
    app     = require('./app.js');
    
var _       = require('underscore'),
    q       = require('q'),
    cache   = require('memory-cache'),
    ejs     = require('ejs'),
    moment  = require('moment');   

// takes two moment.js objects and gives the API url to make a request to.
var generateApiUrl = function(start, end) {
    var start = start.format('YYYY/MM/DD'),
        end   = end.format('YYYY/MM/DD');
    return "http://webapps-test.wesleyan.edu/wapi/v1/public/ems/spec/booking_start/" + start + "/booking_end/" + end + "/";
}

module.exports = function() {
    var today         = moment(),
        twoWeeksLater = moment().add('w', 2);

    db.events.find({'start': {$gte: today, $lt: twoWeeksLater}}, function(err, events) {
        if (err || !events) {
            console.log(req.url);
            console.log("No events found:" + err);
        } else {
            // store events, do something
            // promises?
        }
    });
    
};