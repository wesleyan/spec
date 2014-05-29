// This module runs regularly to assign staff to unstaffed events
var app            = require('./app.js'),
    db             = require('./promised-db.js'),
    Utility        = require('./Utility.js'),
    fetchCalendars = require('./fetchCalendars.js');

var _      = require('underscore'),
    ejs    = require('ejs'),
    mongo  = require('mongojs'),
    moment = require('moment-range');

var isValidDate = function(d) {
  return !isNaN(d.getTime());
};

var fetch = function(start, end, user, callback) {
  fetchCalendars({
    start: start,
    end: end,
    user: user,
    success: function(items) {
      callback(items);
    },
    error: function(err) {
      callback([]);
    }
  });
};

var isStaffAvailable = function(start, end, pointStaffObj) {
  //check each event in the events key of the pointStaffObj
  // to determine if the staff has any conflicting thing
  var range = moment().range(start, end);

  return pointStaffObj.gEvents.map(function(gEvent) {
    return moment().range(gEvent.start, gEvent.end);
  }).reduceRight(function(prev, current) {
    return prev && (!range.overlaps(current));
  }, true);
};

var sendAssignmentNotification = function(event, shift) {
  //send notification/confirmation e-mail to the staff
  Utility.sendSingleMail({
    to: shift.staff + '@wesleyan.edu',
    subject: 'You are assigned to a new shift! : ' + event.title,
    html: ejs.render(fs.readFileSync(__dirname + '/../views/mail/autoAssignConfirmation.ejs', 'utf8'), 
                     {'app': app, 'event': event, 'shift': shift})
  });
};

var assignEventStaff = function(event, pointStaffObj, shift) {
  //assigns the staff to the event
  //console.log('Assign ' + pointStaffObj.staff.username + ' to ' + event.title);

  if(shift === false) {
    // assign to a new shift
    var newShift = {
      id:        mongo.ObjectId(),
      staff:     pointStaffObj.staff.username,
      start:     event.start,
      end:       event.end,
      confirmed: false
    };

    //add shift to database.
    db.events.update({
      _id: event._id
    }, {
      $push: {
        shifts: newShift
      }
    }).then(function() {
        sendAssignmentNotification(event, newShift);
    });

  } else if(_(shift).isObject()) { 
    //assign to a specific shift
    shift.staff = pointStaffObj.staff.username;
    db.events.update({
      '_id':       event._id,
      'shifts.id': shift.id
    }, {
      $set: {
        'shifts.$.staff': shift.staff
      }
    }).then(function() {
        sendAssignmentNotification(event, shift);
    });
  } else {
    console.error('staff object passed to assignEventStaff is invalid.');
  }

};

module.exports = function(cb) {
  var threeDaysLater = {
    start: moment().add('d', 1).startOf('day').toDate(),
    end: moment().add('d', 3).endOf('day').toDate()
  };

  var eventsToAssign = [];

  db.events.find({
    start: {
      $gte: threeDaysLater.start,
      $lt: threeDaysLater.end
    },
  }).toArray().then(function(events) {
    //events has all events of the next 3 days
    //eventsToAssign are the ones that have no full shifts.
    eventsToAssign = events.filter(function(event) {
      return event.shifts.map(function(s){return s.staff;}).filter(function(n){return n;}).length < 1;
    });
    return db.staff.find({ //pick candidates
      task: 'events',      //who do events
      professional: false  //are not professional
      isWorking: true      //and currently on campus
    }).toArray();
  }).then(function(employees) {
    parallel = employees.map(function(employee) {
      return function(cb) {
        db.events.find({
          start: {
            $gte: moment().subtract('d', 30).startOf('day').toDate()
          },
          shifts: {
            $elemMatch: {
              staff: employee.username
            }
          }
        }, function(err, events) {
          if (err || !events) {
            return false;
          }
          cb(null, {
            staff: employee,
            events: events
          });
        });
      };
    });

    async.parallel(parallel, function(err, eventStaff) {
      var categoryValue = {
        "A": 1,
        "B": 1.5,
        "C": 2
      };

      var pointList = _(eventStaff.map(function(obj) {
        var p = obj.events.reduceRight(function(point, event) {
          return point + categoryValue[event.category];
        }, 0);

        return {
          staff: obj.staff,
          point: p
        };
      })).sortBy(function(o) {
        return o.point;
      });

      //pointList is a sorted array of objects
      //fields in objects: staff, point
      //array asc sorted by point

      async.map(pointList,
        function(pointObj, cb) {
          //fetch events for the user and assign them to `events` key.
          fetch(threeDaysLater.start,
            threeDaysLater.end,
            pointObj.staff.username,
            function(gEvents) {
              pointObj.gEvents = gEvents.map(function(gEvent) {
                return {
                  start: new Date(gEvent.start.dateTime),
                  end: new Date(gEvent.end.dateTime)
                };
              }).filter(function(gEvent) {
                return isValidDate(gEvent.start) && isValidDate(gEvent.end);
              });

              cb(null, pointObj);
            });
        },
        function(err, pointListWithEvents) {
          //pointListWithEvents is a sorted array of objects
          //fields in objects: staff, point, gEvents

          // Starting from the top of the list,
          // 1) check availability for the user for each event
          // 2) assign staff to the first possible event
          // 3) remove the assigned staff from the candidate list
          // 4) Continue looping through the events

          // lookForStaff: 
          // precondition : pointListWithEvents have the staff 
          //                who are not auto assigned yet

          var count = 0;

          var lookForStaff = function(event, start, end, shift) {
            //using a for loop to be able to break it when a match is found
            for (var i = 0; i < pointListWithEvents.length; i++) {
              if (isStaffAvailable(start, end, pointListWithEvents[i])) {
                //staff is available, assign
                assignEventStaff(event, pointListWithEvents[i], shift);
                count++;
                //remove the staff from the candidate list for next events
                pointListWithEvents = _.without(pointListWithEvents, pointListWithEvents[i]);
                break;
              }
            }
          };

          eventsToAssign.forEach(function(event) {
            if (event.shifts.length < 1) {
              lookForStaff(event, event.start, event.end, false);
            } else {
              event.shifts.forEach(function(shift) {
                if(shift.staff === '') {
                  //look for staff if the shift is empty
                  lookForStaff(event, shift.start, shift.end, shift);
                }
              });
            }
          });

          cb(count);

        });
      //end of async.map
    });
  });
};