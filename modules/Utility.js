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
        //smtpTransport.close();
    },
    fullShiftNumber: function(event) {
        return event.shifts.map(function(s){return s.staff;}).filter(function(n){return n;}).length;
    },
    updateCachedUsers: function () {
        //We can store all staff in memory, since it is not a big array and it will be used VERY frequently, will save time.
        db.staff.find({}, function(err, data) {
                if (err || !data) {
                    console.log(err);
                } else {
                    cache.put('storeStaff', data);
                    cache.put('staffUsernameArray', 
                        cache.get('storeStaff').map(function(item) {
                            return item.username;
                        })
                    );
                }
            });
    },
    updateCachedInventory: function () {
        //We are storing the inventory in the memory as well
        db.inventory.find({}, function(err, data) {
                if (err || !data) {
                    console.log(err);
                } else {
                    cache.put('allInventory', data);
                }
            });
    },
    inventoryName: function (id) {
        id = parseInt(id);
        return _.findWhere(cache.get('allInventory'), {'id': id}).text;
    }
};

module.exports = Utility;
Utility.updateCachedUsers();
Utility.updateCachedInventory();
