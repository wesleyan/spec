var Preferences = require('./../config/Preferences.js');

var Utility = require('./Utility.js'),
    app     = require('./app.js');

var _     = require('underscore'),
    fs    = require('fs');
    async = require('async'),
    ejs   = require('ejs');

module.exports = function(apiEvents, dbEvents) {
    // create reusable transport method (opens pool of SMTP connections)
    var smtpTransport = Utility.smtpTransport();

    /*
        whatToSend is an object that has user names as keys, 
            and the value of the keys store objects like {update:[...], remove:[...]},
            the arrays have the event.
            by this way, we obtain the notifications each user has to receive.

        whatToReport is an object in the format {update:[...], remove:[...]},
            used to report all changes to the managers.
    */
    var whatToSend   = {},
        whatToReport = {update:[], remove:[]},
        parallel     = [];
    apiEvents.forEach(function(obj) {
        if (obj.status !== 'update') {
            return;
        }
        var event = obj.event;
        event.shifts.forEach(function(shift) {
            if (_.isUndefined(whatToSend[shift.staff])) {
                whatToSend[shift.staff] = {
                    remove: [],
                    update: []
                };
            }
            whatToSend[shift.staff].update.push({
                'event': event,
                'shift': shift
            }); //this is the structure of the array elements, be careful

            whatToReport.update.push(event); //for manager report
        });
    });
    dbEvents.forEach(function(event) {
        event.shifts.forEach(function(shift) {
            if (_.isUndefined(whatToSend[shift.staff])) {
                whatToSend[shift.staff] = {
                    remove: [],
                    update: []
                };
            }
            whatToSend[shift.staff].remove.push({
                'event': event,
                'shift': shift
            }); //this is the structure of the array elements, be careful

            whatToReport.remove.push(event); //for manager report
        });
    });

    //now we have a complete whatToSend object, so we can start to send notifications

    _.each(whatToSend, function(items, user) {
        var staffMailOptions = {
            from: Preferences.mail.fromString,
            to: user + "@wesleyan.edu",
            subject: "Updated Event for " + user + " (IMPORTANT)",
        };

        staffMailOptions.html = ejs.render(fs.readFileSync(__dirname + '/../views/mail/normalUpdate.ejs', 'utf8'), {
            'app': app,
            'items': items
        });

        smtpTransport.sendMail(staffMailOptions, function(error, response) {
            if (error) {
                console.log(error);
                return;
            }
        });
    });

    //now it's time to send managers general reports

    //DEPRECATED BUT KEPT JUST IN CASE:
        //to the managers (all staff with level 10), with whatToReport
        //var managerList = _.where(cache.get('storeStaff'), {level:10});

    if(whatToReport.remove.length > 0 || whatToReport.update.length > 0) {
        var managerList = Preferences.managerEmails;

        managerMailOptions = {
            from: Preferences.mail.fromString,
            subject: "General Event Update Report (IMPORTANT)",
        };

        managerMailOptions.html = ejs.render(fs.readFileSync(__dirname + '/../views/mail/managerUpdate.ejs', 'utf8'), {
            'app': app,
            'items': whatToReport
        });
        managerList.forEach(function(manager) {
            managerMailOptions.to = manager.username + "@wesleyan.edu";
            smtpTransport.sendMail(managerMailOptions, function(error, response) {
                if (error) {
                    console.log(error);
                    return;
                }
            });
        });
    }
    //smtpTransport.close(); //TODO: this should wait for the callbacks to end
};