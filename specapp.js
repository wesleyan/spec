/*
  ____
 / ___|  _ __    ___   ___
 \___ \ | '_ \  / _ \ / __|
  ___) || |_) ||  __/| (__
 |____/ | .__/  \___| \___|
        |_|
*/
// CONFIGURATION AND MODULES
    require('ofe').call();

    // Template engine tags are changed to {{ }} because underscore uses <% %> as well in the front end
    var ejs = require('ejs');
    ejs.open = '{{';
    ejs.close = '}}';

    var express        = require('express'),
        app            = require('./modules/app.js'),
        _              = require('underscore'),
        mongo          = require('mongojs'),
        cas            = require('./modules/grand_master_cas.js'),
        cache          = require('memory-cache'),
        bodyParser     = require('body-parser'),
        methodOverride = require('method-override'),
        cookieParser   = require('cookie-parser'),
        session        = require('express-session');

    var Preferences            = require('./config/Preferences.js'),
        Utility                = require('./modules/Utility.js'),
        db                     = require('./modules/db.js'),
        User                   = require('./modules/user.js'),
        routes                 = require('./routes/index.js'),
        updateEvents           = require('./modules/updateEvents.js');
        textReminders          = require('./modules/textReminders.js'),
        unstaffedNotifications = require('./modules/unstaffedNotifications.js');

    app.locals        = _.extend(app.locals, require('./modules/app.locals.js'));

    cas.configure(Preferences.casOptions);

    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.enable('trust proxy');

    app.use(bodyParser({keepExtensions: true, uploadDir: __dirname + '/uploads'}));
    app.use(methodOverride());
    app.use(cookieParser());
    app.use(session({secret: Preferences.session.secret, name: 'sid', proxy: Preferences.session.proxy}));
    app.use(express.static(__dirname + '/public'));

    app.all('/api/*', function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*"); //or just allowed domains if wanted
      res.header("Access-Control-Allow-Headers", "X-Requested-With");
      next();
    });

// CAS SESSION MANAGEMENT
    // CAS route to redirect to Wesleyan SSO system (GET)
    app.route('/login').get(cas.bouncer, routes.general.login);
    // Log out route, deletes session info (GET)
    app.route('/logout').get(cas.logout);
    // Returns username and permission for the user info saved in session (GET)
    app.route('/user').get(cas.blocker, routes.general.user);

// GOOGLE CALENDAR INTEGRATION
    // Route to redirect to appropriate Google authorization page (GET)
    app.route('/authorize').get(cas.blocker, routes.googleCalendar.authorize);
    // Route to handle the data coming from Google OAuth (GET)
    app.route('/oauth2callback').get(cas.blocker, routes.googleCalendar.oauth2callback);
    // Returns the events in the main calendar of the Wesleyan user, in FullCalendar format. (GET)
    app.route('/gCalEvents/').get(cas.blocker, routes.googleCalendar.events);

// EVENTS
    // Returns the events in the given time period (GET)
    app.route("/events").get(cas.blocker, routes.events.events);
    // Updates the event with the given request body, does some permission checks (PATCH)
    app.route("/events/:id").patch(cas.blocker, routes.events.patch);
    // Remove event (DELETE)
    app.route("/events/:id").delete(cas.blocker, routes.events.delete);

// BILLING
    // General billing interface (GET)
    app.route("/billing").get(cas.blocker, routes.billing.main);
    // Invoice creation route for a single event (GET)
    app.route("/billing/invoice/create/:id").get(cas.blocker, routes.billing.invoice.create);
    // Invoice show/edit route for a single event (GET)
    app.route("/billing/invoice/show/:id").get(cas.blocker, routes.billing.invoice.show);

// API
    // To be used by other IMS applications like PullEffect. (GET)
    // More info can be found in public/doc/index.html
    app.route('/api/events').get(routes.api.events);

// TRIVIAL STUFF

    // INVENTORY
    // All inventory (GET)
    // Inventory Database Interface (GET)
    app.route("/inventory").get(cas.blocker, routes.inventory.db.interface);
    // Inventory DB Read (GET)
    app.route("/inventory/db").get(cas.blocker, routes.inventory.db.get);
    // Inventory DB Create (POST)
    app.route("/inventory/db").post(cas.blocker, routes.inventory.db.post);
    // Inventory DB Update (PATCH)
    app.route("/inventory/db/:id").patch(cas.blocker, routes.inventory.db.patch);
    // Inventory DB Delete (DELETE)
    app.route("/inventory/db/:id").delete(cas.blocker, routes.inventory.db.delete);

    // STAFF
    // All event staff in IMS (GET)
    app.route("/staff/all").get(cas.blocker, routes.staff.all);
    // Staff available today (GET)
    app.route("/staff/available/today").get(cas.blocker, routes.staff.info.availableToday);

    // Returns the events the given staff has worked in - used in /staffCheck (GET)
    app.route("/staff/check").get(cas.blocker, routes.staff.info.check);
    // Static page for single staff check (GET)
    app.route('/staffCheck').get(cas.blocker, routes.staff.info.staffCheck);
    // Returns staff table with their work hours in the given time period (GET)
    app.route("/staff/table").get(cas.blocker, routes.staff.info.table);
    // Static page for staff table (GET)
    app.route('/staffTable').get(cas.blocker, routes.staff.info.staffTable);

    // Static page for staff database (GET)
    app.route('/staff/db').get(cas.blocker, routes.staff.db.db);
    // Adds staff to database (POST)
    app.route('/staff/db/add').post(cas.blocker, routes.staff.db.add);
    // Deletes staff from database (POST)
    app.route('/staff/db/delete').post(cas.blocker, routes.staff.db.delete);
    // Updates staff in database (POST)
    app.route('/staff/db/update').post(cas.blocker, routes.staff.db.update);

    //Shift confirmation for automatic assignment system (GET)
    app.route('/staff/confirm/:id').get(routes.staff.confirm);

// REPORTING
    // Show events of a date in a printer friendly way (GET)
    app.route('/report').get(cas.blocker, routes.report.main);

// GENERAL
    // Main Spec route (GET)
    app.route('/').get(cas.blocker, routes.general.main);
    // Show events of a date in a printer friendly way (GET)
    app.route('/print').get(cas.blocker, routes.print);

// MOBILE
    // Route for the mobile site (GET)
    app.route('/m').get(cas.blocker, routes.mobile.m);
    // Route for the mobile site, counter indicates the requested date. (GET)
    app.route('/m/:counter/').get(cas.blocker, routes.mobile.mWithCounter);
    // Mobile route for showing single event info. (GET)
    app.route('/m/event/:id').get(cas.blocker, routes.mobile.event);
    // Mobile route for showing single staff info. (GET)
    app.route('/m/staff/:username').get(cas.blocker, routes.mobile.staff);

// UPDATING EVENTS
    setInterval(updateEvents, 1000 * 60 * 60 * 4); //every 4 hours
    app.get('/update', function(req, res) {
        User.permissionControl(req, res, 10);
        updateEvents(function(result) {
            //result structure -> {update: {add: int, update: int, remove: int},
            //                     autoAssignCount: int}

            //console.log(JSON.stringify(result));
            res.redirect(Preferences.path_on_server);
        });
    });
// TEXT REMINDERS
    setInterval(textReminders, 1000 * 60 * 5); //every 5 minutes
// UNSTAFFED NOTIFICATIONS
    setInterval(unstaffedNotifications, 1000 * 60 * 5); //every 5 minutes

// STARTING THE SERVER
    app.listen(Preferences.port, function() {
        console.log("Express server listening on port " + Preferences.port);
    });
    /* //options should have SSL certificates
    https.createServer(options, app).listen(Preferences.port, function() {
        console.log("Express server listening on port " + Preferences.port);
    });
    */
