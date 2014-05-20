var Preferences = require('./../config/Preferences.js');

var Utility     = require('./Utility.js'),
    db          = require('./promised-db.js'),
    app         = require('./app.js'),
    hackyAssign = require('./hackyAssign.js'),
    categorize  = require('./categorizeEvents.js');

var sendEmsUpdateNotifications = require('./sendEmsUpdateNotifications.js');

var request   = require('./promised-request.js'),
    dumpError = require('./dumpError.js');

var _       = require('underscore'),
    Q       = require('q'),
    cache   = require('memory-cache'),
    ejs     = require('ejs'),
    async   = require('async'),
    moment  = require('moment');

// takes two moment.js objects and gives the API url to make a request to.
var generateApiUrl = function(start, end) {
    start = start.format('YYYY/MM/DD'),
    end   = end.format('YYYY/MM/DD');
    return "http://webapps-test.wesleyan.edu/wapi/v1/public/ems/spec/booking_start/" + start + "/booking_end/" + end + "/";
};

//returns an object of the different fields.
//takes the value from the first object if different
var giveDifferenceOnFields = function(obj1, obj2, fieldList) {
    return fieldList.reduce(function(prev, field) {
        if(_.isEqual(obj1[field], obj2[field])) {
            return prev;
        } else {
            prev[field] = obj1[field];
            return prev;
        }
    }, {});
};

var processEvent = function(apiEvent) {
    if(_.isNull(apiEvent.notes)) {
        apiEvent.notes = '';
    }

    var multipleDaysEvent = false;
    if(apiEvent.booking_start_time.slice(-2) === 'PM' && apiEvent.booking_end_time.slice(-2) === 'AM') {
        multipleDaysEvent = true;
    }

    apiEvent.start      = new Date(apiEvent.booking_start_date + ' ' + apiEvent.booking_start_time);
    apiEvent.eventStart = new Date(apiEvent.booking_start_date + ' ' + apiEvent.event_start_time);
    // TODO: check if the event ends goes over midnight
    apiEvent.end        = new Date(apiEvent.booking_start_date + ' ' + apiEvent.booking_end_time);
    apiEvent.eventEnd   = new Date(apiEvent.booking_start_date + ' ' + apiEvent.event_end_time);

    if(multipleDaysEvent) {
        apiEvent.end      = moment(apiEvent.end).add('d', 1).toDate();
        apiEvent.eventEnd = moment(apiEvent.eventEnd).add('d', 1).toDate();
    }

    return {
        XMLid:        apiEvent.service_order_detail_id,
        title:        apiEvent.event_name,
        desc:         apiEvent.category !== 'A/V Services' ? apiEvent.notes : apiEvent.resources,
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

module.exports = function(cb) {
    var today         = moment().startOf('day'),
        twoWeeksLater = moment().add('w', 2).endOf('day');

    var apiEvents, dbEvents;

    // make a request to the API
    request(generateApiUrl(today,twoWeeksLater))
        .then(function(body) {
            apiEvents = JSON.parse(body).records.map(function(e) {
                e.service_order_detail_id = parseInt(e.service_order_detail_id);
                return e;
            });
            // fetch the events in the period from Spec database
            return db.events.find({'start': {$gte: today.toDate(), $lt: twoWeeksLater.toDate()}}).toArray();
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
                dbEvents = dbEvents.filter(function(event) {
                    return (event.XMLid !== apiEvent.service_order_detail_id);
                });

                var processedEvent = processEvent(apiEvent);

                var fieldsToCheck = ['start', 'end', 'eventStart', 'eventEnd', 'desc', 'title', 'loc', 'cancelled'];

                var shouldInsert = _.isUndefined(correspondent);
                var shouldUpdate, eventDifference;
                
                if(!shouldInsert) {
                    eventDifference = giveDifferenceOnFields(processedEvent, correspondent, fieldsToCheck);
                    shouldUpdate = !_.isEqual(eventDifference, {});
                    if(correspondent.updated) {
                        //if the event info is updated at a point, the integration system shouldn't update it.
                        shouldUpdate = false;
                    }
                }
               
                if(shouldInsert) {
                    //insert event
                    return {
                        status: 'add',
                        event: hackyAssign(categorize(processedEvent)), //hacky auto staff assignment stuff
                    };
                } else if(shouldUpdate) {
                    //update event
                    return {
                        status: 'update',
                        event: processedEvent,
                        update: eventDifference
                    };
                } else {
                    return {
                        status: 'pass'
                    };
                }
            }).filter(function(item) {
                return item.status !== 'pass';
            });

            var changeNumbers = {add:0, update:0, remove: 0},
                parallel      = [],
                whatToReport  = {update:[], remove: dbEvents};

            //deal with apiEvents, insert or update accordingly
            apiEvents.forEach(function(obj) { 
                if(obj.status === 'add') {
                    // Push a function to insert the event
                    parallel.push(function(callback) {
                        db.events.save(obj.event, function(err, saved) {
                            if (err || !saved) {
                                console.log("New event is not saved");
                            } else {
                                changeNumbers.add++;
                                callback();
                            }
                        });
                    });
                } else if(obj.status === 'update') {
                    parallel.push(function(callback) {
                        db.events.findAndModify({
                            query: {XMLid: obj.event.XMLid},
                            update: {$set: obj.update }, 
                            new: true
                        },
                        function(err, updated) {
                            if (err || !updated) {
                                console.log("Event could not be updated: " + err);
                                console.log(obj.event.title);
                            } else {
                                changeNumbers.update++;
                                whatToReport.update.push(updated);
                                callback();
                            }
                        });
                    });
                }
            });
            //the remaining events in dbEvents should be set cancelled.
            dbEvents.forEach(function(event) {
                parallel.push(function(callback) {
                    db.events.findAndModify({
                        query: {XMLid: event.XMLid},
                        update: {$set: {cancelled: true} }, 
                        new: true
                    },
                    function(err, updated) {
                        if (err || !updated) {
                            console.log("Event could not be called off: " + err);
                            console.log(event.title);
                        } else {
                            changeNumbers.remove++;
                            callback();
                        }
                    });
                });
            });

            async.parallel(parallel, function() {
                console.log(changeNumbers.add + ' events added, ' + 
                            changeNumbers.update + ' updated and ' + 
                            changeNumbers.remove + ' called off, ' + 
                            'update process ended successfully.');

                // send notifications to the updated/called off event staff / managers
                /* sendEmsUpdateNotifications(
                    [{status:'insert', event:...}, {status:'update',event:...}, {status:'pass'}],
                    [{CANCELLED EVENT OBJECT}])
                   // the data structure of the first parameter can be seen above
                   // second parameter contains an array of cancelled event objects
                */
                sendEmsUpdateNotifications(apiEvents, dbEvents);
                if(!_.isUndefined(cb)) {
                    cb(changeNumbers);
                }
            });
        })
        .fail(function(err) { //triggered in any error
            dumpError(err);
        });
};
