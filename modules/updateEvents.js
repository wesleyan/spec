var Preferences = require('./../config/Preferences.js');

var Utility     = require('./Utility.js'),
    db          = require('./promised-db.js'),
    app         = require('./app.js'),
    autoAssign  = require('./autoAssign.js');
    
var request = require('promised-request');

var _       = require('underscore'),
    Q       = require('q'),
    cache   = require('memory-cache'),
    ejs     = require('ejs'),
    moment  = require('moment');

// takes two moment.js objects and gives the API url to make a request to.
var generateApiUrl = function(start, end) {
    start = start.format('YYYY/MM/DD'),
    end   = end.format('YYYY/MM/DD');
    return "http://webapps-test.wesleyan.edu/wapi/v1/public/ems/spec/booking_start/" + start + "/booking_end/" + end + "/";
};

var keysEqual = function(obj1, obj2, fieldList) {
    return fieldList.map(function(field) {
        return _.isEqual(obj1[field], obj2[field]);
    }).indexOf(false) === -1;
};

var processEvent = function(apiEvent) {
    apiEvent.start      = new Date(apiEvent.booking_start_date + ' ' + apiEvent.booking_start_time);
    apiEvent.eventStart = new Date(apiEvent.booking_start_date + ' ' + apiEvent.event_start_time);
    // TODO: check if the event ends goes over midnight
    apiEvent.end        = new Date(apiEvent.booking_start_date + ' ' + apiEvent.booking_end_time);
    apiEvent.eventEnd   = new Date(apiEvent.booking_start_date + ' ' + apiEvent.event_end_time);

    return {
        XMLid:        apiEvent.service_order_detail_id,
        title:        apiEvent.event_name,
        desc:         apiEvent.notes,
        loc:          apiEvent.room_description,
        start:        apiEvent.start,
        end:          apiEvent.end,
        eventStart:   apiEvent.eventStart,
        eventEnd:     apiEvent.eventEnd,
        cancelled:    apiEvent.booking_status === 'Cancelled',
        techMustStay: true,
        video:        ['video', 'recording'].reduce(function(prev, word) {
                          if (prev) {
                              return true;
                          } else {
                              return apiEvent.notes.indexOf(word) !== -1;
                          }
                      }, false),
        customer:     {
                          name: apiEvent.customer,
                          phone: apiEvent.customer_phone
                      },
        inventory:    [],
        notes:        [],
        shifts:       [],
        staffNeeded:  1
    };
};

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
            // compare apiEvents to dbEvents,
            // map the list to return an object {status:'insert/update', event: eventObject}
            // delete the event from dbEvents if matched
            apiEvents = apiEvents.map(function(apiEvent) {
                //find the same event in dbEvents
                var correspondent = _.findWhere(dbEvents, {XMLid: apiEvent.service_order_detail_id});
                // delete correspondent from dbEvents
                dbEvents = _.reject(dbEvents, function(event) {
                    return event.XMLid == apiEvent.service_order_detail_id;
                });

                var processedEvent = apiProcessedEventToSpecEvent(apiEvent);

                var fieldsToCheck = ['start', 'end', 'eventStart', 'eventEnd', 'desc', 'title', 'loc', 'cancelled'];

                var shouldInsert = _.isUndefined(correspondent);
                var shouldUpdate = !keysEqual(processEvent, correspondent, fieldsToCheck);
               
                if(shouldInsert) {
                    //insert event
                    return {
                        status: 'insert',
                        event: processedEvent,
                    };
                } else if(shouldUpdate) {
                    //update event
                    return {
                        status: 'update',
                        event: processedEvent,
                    };
                } else {
                    return {
                        status: 'pass'
                    };
                }
            }).filter(function(item) {
                return item.status !== 'pass';
            });

            //deal with apiEvents, insert or update accordingly

            //the remaining events in dbEvents should be set cancelled.

        })
        .fail(function(err) { //triggered in any error
            console.log(err);
        });
};