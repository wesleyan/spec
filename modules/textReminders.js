var Utility = require('./Utility.js'),
    db      = require('./db.js');
    
var _       = require('underscore'),
    cache   = require('cache'),
    ejs     = require('ejs'),
    moment  = require('moment');   

module.exports = function() {
    //check if there is an event starting in 5 min
    var fiveMinCheck = {'start': {$gte: moment().add('m',60).toDate(), $lt: moment().add('m',65).toDate()}};
    db.events.find(fiveMinCheck, function(err, events) {
        if (err || !events) {
            console.log(req.url);
            console.log(err);
        } else {
            var providers = ['vtext.com', 'txt.att.net', 'tomomail.net', 'messaging.sprintpcs.com', 'vmobl.com'];
            //not using a function for e-mail sending because we need to close the connection after all stuff
            var smtpTransport = Utility.smtpTransport();
            events.forEach(function(event) {
                event.shifts.forEach(function(shift) {
                    var phone = _.findWhere(cache.get('storeStaff'), {'username': shift.staff});
                    if(_.isUndefined(phone) || phone == false || phone.toString().length !== 10) {
                        return false;
                    }
                    var mailOptions = {
                        from: "Wesleyan Spec <wesleyanspec@gmail.com>",
                        subject: "Text reminder for " + user,
                    };
                    mailOptions.html = ejs.render(fs.readFileSync(__dirname + '/../views/mail/textReminder.ejs', 'utf8'), {
                        'app': req.app,
                        'event': event,
                        'shift': shift
                    });
                    providers.each(function(provider) {
                        mailOptions.to = phone + "@" + provider; //we need to fetch the phone actually
                        smtpTransport.sendMail(mailOptions, function(error, response) {
                            if (error) {
                                console.log(error);
                            } else {
                                //console.log("Message sent: " + response.message);
                            }
                        });
                    });
                }); //event.shifts.forEach ends
            }); //events.forEach ends
            smtpTransport.close();
        }
    });
}