var _             = require("underscore"),
    nodemailer    = require("nodemailer"),
    cache         = require('memory-cache');

var Preferences = require('./../config/Preferences.js'),
    db          = require('./db.js');

var Utility = {
    smtpTransport: function() {
        return nodemailer.createTransport("SMTP", {
            service: Preferences.mail.service,
            auth: {
                user: Preferences.mail.user,
                pass: Preferences.mail.pass
            }
        });
    },
    sendSingleMail: function(options, callback) {
        var smtpTransport = Utility.smtpTransport();
        var mailOptions = {
            from: Preferences.mail.fromString,
            subject: options.subject,
            html: options.html,
            to: options.to
        };

        smtpTransport.sendMail(mailOptions, function(error, response) {
            if (error) {
                console.log(error);
            } else {
                if (typeof callback === 'function') {
                    callback(response);
                }
            }
        });
        smtpTransport.close();
    },
    fullShiftNumber: function(event) {
        return event.shifts.map(function(s){return s.staff}).filter(function(n){return n}).length;
    },
    addBackgroundColor: function(events) { //changes the events object
        for (index = 0; index < events.length; ++index) {
            event = events[index];
            if (event.techMustStay == false) {
                events[index]['className'] = ['striped']; //handles the setup and breakdown events as well
            }
            if (event.cancelled == true) {
                events[index]['backgroundColor'] = Preferences.backgroundColors.gray;
            } else if (Utility.fullShiftNumber(event) == 0) {
                events[index]['backgroundColor'] = Preferences.backgroundColors.red;
            } else if (Utility.fullShiftNumber(event) < event.staffNeeded) {
                events[index]['backgroundColor'] = Preferences.backgroundColors.yellow;
            } else if (Utility.fullShiftNumber(event) == event.staffNeeded) {
                events[index]['backgroundColor'] = Preferences.backgroundColors.green;
            }
        }
        return events;
    },
    updateCachedUsers: function () {
        //We can store all staff in memory, since it is not a big array and it will be used VERY frequently, will save time.
        db.staff.find({}, function(err, data) {
                if (err || !data) {
                    console.log(req.url);
                    console.log(err);
                } else {
                    var arr = [];
                    cache.put('storeStaff', data);
                    cache.get('storeStaff').forEach(function(item) {
                        arr.push(item.username);
                    });
                    cache.put('staffUsernameArray', arr);
                }
            });
    },
    updateCachedInventory: function () {
        //We are storing the inventory in the memory as well
        db.inventory.find({}, function(err, data) {
                if (err || !data) {
                    console.log(req.url);
                    console.log(err);
                } else {
                    cache.put('allInventory', data);
                }
            });
    },
    inventoryName: function (id) {
        var id = parseInt(id);
        return _.findWhere(cache.get('allInventory'), {'id': id}).text;
    }
};

module.exports = Utility;
Utility.updateCachedUsers();
Utility.updateCachedInventory();