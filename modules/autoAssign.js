// This module runs regularly to assign staff to unstaffed events
var db = require('./promised-db.js');

var _      = require('underscore'),
    moment = require('moment');

module.exports = function () {
  var threeDaysLater = moment().add('d', 3);
  
  db.events.find({
    start: {
      $gte: threeDaysLater.startOf('day'),
      $lt: threeDaysLater.endOf('day')
    }
  }).toArray().then(function (events) {
    return db.staff.find({task: 'events'}).toArray();
  }).then(function (employees) {
     parallel = employees.map(function (employee) {
       return function (cb) {
         db.staff.find({
                         start: {
                           $gte: moment().subtract('d', 30).startOf('day')
                         }, 
                         shifts: {$elemMatch: {staff: employee}}
                       }, function (err, events) {
           if(err || !events) {return false;}
           cb(null, {staff: employee, events: events});
         });
       };
     });

     async.parallel(parallel, function (err, eventStaff) {
       var categoryValue = {
         "A" : 1,
         "B" : 1.5,
         "C" : 2
       };

       var pointList = _(eventStaff.map(function (obj) {
         var p = obj.events.reduceRight(function (point, event) {
           return point + categoryValue[event.category];    
         }, 0);

         return {staff: obj.staff, point: p};
       })).sortBy(function (o) {
         return o.point;
       });

       //pointList is a sorted array of objects
       //fields in objects: staff, point
       //array asc sorted by point

      //TODO: starting from the top of the list,
      // 1) check availability for the user for each event
      // 2) assign staff to the first possible event
      // 3) move to next staff if not available or if there's any other staff

     });
  });
};
