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

	var express = require('express'),
		app 	= express(),
		$ 		= require('jquery'),
		_ 		= require('underscore'),
		mongo 	= require('mongodb-wrapper'),
		fs 		= require('fs'),
		cas 	= require('./modules/grand_master_cas.js'),
		async 	= require('async'),
		ejs 	= require('ejs'),
		cache 	= require('memory-cache');

	var Preferences   = require('./config/Preferences.js'),
		Utility 	  = require('./modules/Utility.js'),
		User 		  = require('./modules/user.js'),
		db 			  = require('./modules/db.js'),
		routes 		  = require('./routes/index.js'),
		textReminders = require('./modules/textReminders.js');

	app.locals 		= _.extend(app.locals, require('./modules/app.locals.js'));

	cas.configure(Preferences.casOptions);

	app.configure(function() {
		app.set('views', __dirname + '/views');
		app.set('view engine', 'ejs');
		// Template engine tags are changed to {{ }} because underscore uses <% %> as well in the front end
		app.set('view options', {open: '{{', close: '}}'});
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

	app.get('/login', cas.bouncer, routes.general.login);

	app.get('/logout', cas.logout);

	app.get("/user", cas.blocker, routes.general.user);

// GOOGLE CALENDAR INTEGRATION

	// TODO: Replace with or add a button on frontend
	app.get('/authorize', cas.blocker, routes.googleCalendar.authorize);
	app.get('/oauth2callback', cas.blocker, routes.googleCalendar.oauth2callback);
	app.get('/gCalEvents/', cas.blocker, routes.googleCalendar.events);

// EVENTS

	//Event fetching should be filtered according to the time variables, still not done after MongoDB
	app.get("/events", cas.blocker, routes.events.events);

	app.post("/event/techMustStay", cas.blocker, routes.events.techMustStay);
	app.post("/event/video", cas.blocker, routes.events.video);
	app.post("/event/audio", cas.blocker, routes.events.audio);
	app.post("/event/edit", cas.blocker, routes.events.edit);
	app.post("/event/spinner", cas.blocker, routes.events.spinner);
	app.post("/event/cancel", cas.blocker, routes.events.cancel);
	app.post("/event/remove", cas.blocker, routes.events.remove);

	app.get('/print', cas.blocker, routes.print);

// API
	app.get('/api/events', routes.api.events);

// TRIVIAL STUFF

	// INVENTORY
	// All inventory
	app.get("/inventory/all", cas.blocker, routes.inventory.all);

	//Existing inventory for each event
	app.get("/inventory/existing/:id", cas.blocker, routes.inventory.existing);

	//Inventory Update
	//Add inventory to an event (POST)
	app.post("/inventory/add", cas.blocker, routes.inventory.add);

	//Remove inventory from an event (POST)
	app.post("/inventory/remove", cas.blocker, routes.inventory.remove);

	// NOTES
	//Existing notes for each event
	app.get("/notes/existing/:id", cas.blocker, routes.notes.existing);

	//Notes Update
	//Add inventory to an event (POST) - not tested // username is required
	app.post("/notes/add", cas.blocker, routes.notes.add);

	//Remove inventory from an event (POST) - username is required for verification
		//managers should be able to delete any comment, others should only be able to delete their own
	app.post("/notes/remove", cas.blocker, routes.notes.remove);

	// STAFF
	//All event staff in IMS
	app.get("/staff/all", cas.blocker, routes.staff.all);
	//Get the existing staff of an event
	app.get("/staff/get/:id", cas.blocker, routes.staff.get);
	//Add staff/shift to an event (POST)
	app.post("/staff/add", cas.blocker, routes.staff.add);
	//Remove staff/shift from an event (POST)
	app.post("/staff/remove", cas.blocker, routes.staff.remove);
	//Sign up for an empty shift for an event (POST)
	app.post("/staff/shiftsignup", cas.blocker, routes.staff.shiftsignup);
	//Withdrawing from a shift for an event (POST)
	app.post("/staff/withdraw", cas.blocker, routes.staff.withdraw);

	//this is determined by staff time checking, not shift time checking, therefore if 
	app.get("/staff/available/today", cas.blocker, routes.staff.info.availableToday);

	app.get("/staff/check", cas.blocker, routes.staff.info.check);
	app.get("/staff/table", cas.blocker, routes.staff.info.table);
	app.get('/staffCheck', cas.blocker, routes.staff.info.staffCheck);
	app.get('/staffTable', cas.blocker, routes.staff.info.staffTable);

	app.get('/staff/db', cas.blocker, routes.staff.db.db);
	app.post('/staff/db/add', cas.blocker, routes.staff.db.add);
	app.post('/staff/db/delete', cas.blocker, routes.staff.db.delete);
	app.post('/staff/db/update', cas.blocker, routes.staff.db.update);

// FILE UPLOAD
	app.get('/fileUpload', cas.blocker, routes.fileUpload.get);

	app.post('/fileUpload', cas.blocker, routes.fileUpload.post);

// MAIN PAGE RENDERING
	app.get('/', cas.blocker, routes.general.main);

// MOBILE
	app.get('/m', cas.blocker, routes.mobile.m);
	app.get('/m/:counter/', cas.blocker, routes.mobile.mWithCounter);
	app.get('/m/event/:id', cas.blocker, routes.mobile.event);
	app.get('/m/staff/:username', cas.blocker, routes.mobile.staff);

// TEXT REMINDERS
	setInterval(textReminders, 1000 * 60 * 5); //every 5 minutes

// STARTING THE SERVER
	app.listen(Preferences.port, function() {
		console.log("Express server listening on port " + Preferences.port);
	});
	/* //options should have SSL certificates
	https.createServer(options, app).listen(Preferences.port, function() {
		console.log("Express server listening on port " + Preferences.port);
	});
	*/