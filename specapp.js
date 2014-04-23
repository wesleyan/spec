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

    var express = require('express'),
        app     = require('./modules/app.js'),
        _       = require('underscore'),
        cas     = require('./modules/grand_master_cas.js'),
        cache   = require('memory-cache');

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

    app.configure(function() {
        app.set('views', __dirname + '/views');
        app.set('view engine', 'ejs');
        
        app.use(express.bodyParser({keepExtensions: true, uploadDir: __dirname + '/uploads'}));
        app.use(express.methodOverride());
        app.use(express.cookieParser('secret'));
        app.use(express.session());
        app.use(app.router);
        app.use(express.static(__dirname + '/public'));
    });

    app.all('/api/*', function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*"); //or just allowed domains if wanted
      res.header("Access-Control-Allow-Headers", "X-Requested-With");
      next();
    });

// CAS SESSION MANAGEMENT
    // CAS route to redirect to Wesleyan SSO system (GET)
    app.get('/login', cas.bouncer, routes.general.login);
    // Log out route, deletes session info (GET)
    app.get('/logout', cas.logout);
    // Returns username and permission for the user info saved in session (GET)
    app.get("/user", cas.blocker, routes.general.user);

// GOOGLE CALENDAR INTEGRATION
    // Route to redirect to appropriate Google authorization page (GET)
    app.get('/authorize', cas.blocker, routes.googleCalendar.authorize);
    // Route to handle the data coming from Google OAuth (GET)
    app.get('/oauth2callback', cas.blocker, routes.googleCalendar.oauth2callback);
    // Returns the events in the main calendar of the Wesleyan user, in FullCalendar format. (GET)
    app.get('/gCalEvents/', cas.blocker, routes.googleCalendar.events);

// EVENTS
    // Returns the events in the given time period (GET)
    app.get("/events", cas.blocker, routes.events.events);
    // Toggle techMustStay to change if staff stays at the duration of the event (POST)
    app.post("/event/techMustStay", cas.blocker, routes.events.techMustStay);
    // Toggle if it's a video event (POST)
    app.post("/event/video", cas.blocker, routes.events.video);
    // Toggle if it's a audio event (POST)
    app.post("/event/audio", cas.blocker, routes.events.audio);
    // Edit event (POST)
    app.post("/event/edit", cas.blocker, routes.events.edit);
    // Change needed staff number (POST)
    app.post("/event/spinner", cas.blocker, routes.events.spinner);
    // Toggle event cancel (POST)
    app.post("/event/cancel", cas.blocker, routes.events.cancel);
    // Remove event (POST)
    app.post("/event/remove", cas.blocker, routes.events.remove);

// API
    // To be used by other IMS applications like PullEffect. (GET)
    // More info can be found in public/doc/index.html
    app.get('/api/events', routes.api.events);

// TRIVIAL STUFF

    // INVENTORY
    // All inventory (GET)
    app.get("/inventory/all", cas.blocker, routes.inventory.all);
    // Existing inventory for each event (GET)
    app.get("/inventory/existing/:id", cas.blocker, routes.inventory.existing);
    // Add inventory to an event (POST)
    app.post("/inventory/add", cas.blocker, routes.inventory.add);
    // Remove inventory from an event (POST)
    app.post("/inventory/remove", cas.blocker, routes.inventory.remove);

    // NOTES
    // Existing notes for each event (GET)
    app.get("/notes/existing/:id", cas.blocker, routes.notes.existing);
    // Add inventory to an event (POST)
    app.post("/notes/add", cas.blocker, routes.notes.add);
    // Remove inventory from an event (POST)
    app.post("/notes/remove", cas.blocker, routes.notes.remove);

    // STAFF
    // All event staff in IMS
    app.get("/staff/all", cas.blocker, routes.staff.all);
    // Get the existing staff of an event
    app.get("/staff/get/:id", cas.blocker, routes.staff.get);
    // Add staff/shift to an event (POST)
    app.post("/staff/add", cas.blocker, routes.staff.add);
    // Remove staff/shift from an event (POST)
    app.post("/staff/remove", cas.blocker, routes.staff.remove);
    // Sign up for an empty shift for an event (POST)
    app.post("/staff/shiftsignup", cas.blocker, routes.staff.shiftsignup);
    // Withdrawing from a shift for an event (POST)
    app.post("/staff/withdraw", cas.blocker, routes.staff.withdraw);
    // Staff available today (GET)
    app.get("/staff/available/today", cas.blocker, routes.staff.info.availableToday);

    // Returns the events the given staff has worked in - used in /staffCheck (GET)
    app.get("/staff/check", cas.blocker, routes.staff.info.check);
    // Static page for single staff check (GET)
    app.get('/staffCheck', cas.blocker, routes.staff.info.staffCheck);
    // Returns staff table with their work hours in the given time period (GET)
    app.get("/staff/table", cas.blocker, routes.staff.info.table);
    // Static page for staff table (GET)
    app.get('/staffTable', cas.blocker, routes.staff.info.staffTable);

    // Static page for staff database (GET)
    app.get('/staff/db', cas.blocker, routes.staff.db.db);
    // Adds staff to database (POST)
    app.post('/staff/db/add', cas.blocker, routes.staff.db.add);
    // Deletes staff from database (POST)
    app.post('/staff/db/delete', cas.blocker, routes.staff.db.delete);
    // Updates staff in database (POST)
    app.post('/staff/db/update', cas.blocker, routes.staff.db.update);

// GENERAL
    // Main Spec route (GET)
    app.get('/', cas.blocker, routes.general.main);
    // Show events of a date in a printer friendly way (GET)
    app.get('/print', cas.blocker, routes.print);

// MOBILE
    // Route for the mobile site (GET)
    app.get('/m', cas.blocker, routes.mobile.m);
    // Route for the mobile site, counter indicates the requested date. (GET)
    app.get('/m/:counter/', cas.blocker, routes.mobile.mWithCounter);
    // Mobile route for showing single event info. (GET)
    app.get('/m/event/:id', cas.blocker, routes.mobile.event);
    // Mobile route for showing single staff info. (GET)
    app.get('/m/staff/:username', cas.blocker, routes.mobile.staff);

// UPDATING EVENTS
    setInterval(updateEvents, 1000 * 60 * 60 * 4); //every 4 hours
    app.get('/update', function(req, res) {
        User.permissionControl(req, res, 10);
        updateEvents(function(change) {
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