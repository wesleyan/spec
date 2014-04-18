var Preferences = require('./../config/Preferences.js');

var Utility = require('./Utility.js'),
    db      = require('./promised-db.js'),
    app     = require('./app.js');
    
var request = require('promised-request');

var _       = require('underscore'),
    Q       = require('q'),
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

    var apiEvents, dbEvents;

    // make a request to the API
    request(generateApiUrl(today,twoWeeksLater))
        .then(function(body) {
            apiResponse = body;
            // fetch the events in the period from Spec database
            return db.events.find({'start': {$gte: today, $lt: twoWeeksLater}}).toArray();
        })
        .then(function(events) {
            dbEvents = events;
            // compare apiEvents and dbEvents
        })
        .fail(function(err) { //triggered in any error
            console.log(err);
        });
};