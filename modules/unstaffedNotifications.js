var Preferences = require('./../config/Preferences.js');

var Utility = require('./Utility.js'),
    db      = require('./db.js');
    
var _       = require('underscore'),
    fs      = require('fs'),
    ejs     = require('ejs'),
    moment  = require('moment');

module.exports = function() {
    //check if there is an event starting in an hour
    var fiveMinCheck = {'start': {$gte: moment().add('m',60).toDate(), $lt: moment().add('m',65).toDate()}};
    db.events.find(fiveMinCheck, function(err, events) {
        if (err || !events) {
            console.log(req.url);
            console.log(err);
        } else {
            //not using a function for e-mail sending because we need to close the connection after all stuff
            var smtpTransport = Utility.smtpTransport();
            events.forEach(function(event) {

                if(Utility.fullShiftNumber(event) < 1) {
                    var mailOptions = {
                        from: Preferences.mail.fromString,
                        subject: "Unstaffed event in an hour!",
                    };
                    mailOptions.html = ejs.render(fs.readFileSync(__dirname + '/../views/mail/unstaffedNotification.ejs', 'utf8'), {
                        'app': req.app,
                        'event': event
                    });
                    Preferences.notificationEmails.each(function(address) {
                        mailOptions.to = address; //we need to fetch the phone actually
                        smtpTransport.sendMail(mailOptions, function(error, response) {
                            if (error) {
                                console.log(error);
                            } else {
                                //console.log("Message sent: " + response.message);
                            }
                        });
                    });
                }
            }); //events.forEach ends
            smtpTransport.close();
        }
    });
};