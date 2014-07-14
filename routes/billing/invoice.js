var Preferences = require('./../../config/Preferences.js');

var Utility = require('./../../modules/Utility.js'),
    User    = require('./../../modules/user.js'),
    db      = require('./../../modules/db.js');

var fs      = require('fs'),
    _       = require('underscore'),
    mongo   = require('mongojs');

var hourlyPrice = 20;

var createList = function(event) {
  var inventory = event.inventory.map(function(item) {
    return {
      desc: Utility.inventoryName(item.item),
      amt: item.amt,
      rate: Utility.inventoryHourlyPrice(item.item)
    };
  });

  var first;
  if(event.techMustStay) {
    var shiftHour = event.shifts.reduce(function(prev, shift){return prev + ((Date.parse(shift.end)-Date.parse(shift.start))/(60*60*1000));}, 0);
    first = {
      desc: event.shifts.length + ' technician shift',
      amt: shiftHour,
    };
  } else {
    first = {
      desc: 'Setup and Breakdown',
      amt: 1,
    };
  }
  first.rate = hourlyPrice;
  return [first].concat(inventory);
};

module.exports = {
  create: function(req, res) {
    // this route creates the invoice information and assigns it
    // https://github.com/wesleyan/spec/issues/13#issuecomment-48752684
    res.json(true);
  },
  show: function(req, res) {
    db.events.findOne({_id: mongo.ObjectId(req.params.id)}, function(err, event) {
      if(err || !event) {
        console.error('invoice event couldnt found');
        res.status(400).json(false);
        return;
      }

      res.render('invoice', {
          app   : req.app,
          event : event,
          list  : createList(event)
      });
    });
  };
};


