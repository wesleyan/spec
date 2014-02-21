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
	var request = require('request'),
		googleapis = require('googleapis'),
		OAuth2Client = googleapis.OAuth2Client,
		oauth_cache = {};

	try {
		oauth_cache = JSON.parse(fs.readFileSync(__dirname + Preferences.path_client_secret, 'utf8'));
	} catch (e) {
		console.log("Could not read client secret file from the config directory\nError: " + e);
	}

	// TODO: Replace with or add a button on frontend
	app.get('/authorize', cas.blocker, function(req, res) {
		//if we have the refresh token for the user, then we just need to refreshAccessToken, otherwise take permission
		var oauth2Client = new OAuth2Client(oauth_cache.web.client_id, oauth_cache.web.client_secret, Preferences.googleRedirectUrl);
		getFirstToken(oauth2Client, app, req, res);
	});


	// Requests list and sends response to collection
	var read_models = function(req, options) {
		googleapis.discover('calendar', 'v3').withOpts({cache: {path: './config'}})
			.execute(function(err, client) {
				var auth = new OAuth2Client();
				auth.credentials = req.session.credentials;
				getCalendar(client, auth, 'me', options, req);
			});
	}
	// Fetches calendar objects from Google calendar
	function getCalendar(client, authClient, userId, options, req) {
		client.calendar.events.list({
				calendarId: 'primary',
				//maxResults: 5,
				orderBy: "startTime",
				singleEvents: true,
				timeMin: options.timeMin,
				timeMax: options.timeMax,
				fields: "items(end,start,summary,description),summary"
			})
			.withAuthClient(authClient)
			.execute(function(err, calendar) {
				if (err) {
					// TODO: After the access_token is refreshed, there should be a new attempt to getCalendar
					if (err.message == "Invalid Credentials") {
						//console.log("Invalid OAuth credentials");
						refreshAccessToken(options, req);
					} else {
						console.log("An error occurred!\n", err);
						options.error(true);
					}
				} else
					options.success(calendar.items);
			});
	}

	// Fetch access & refresh token
		/* this function is only for the first time to fetch access & refresh tokens
		if there is a refresh token registered for that user but no valid access token, you need to use refreshAccessToken function*/
	function getFirstToken(oauth2Client, app, req, res) {
		// OAuth options
		var oauthOptions = {access_type: 'offline', scope: 'https://www.googleapis.com/auth/calendar'};

		// Prompt for consent page if no valid refresh token
		if (_.isUndefined(req.session.refresh_token)) {
			oauthOptions.prompt = 'consent';
		}

		// Generate request URL and redirect user
		res.redirect(oauth2Client.generateAuthUrl(oauthOptions));

		// After user authentication
		// Google responds with an access "code"
		app.get('/oauth2callback', cas.blocker, function(req, res) {
			oauth2Client.getToken(req.query.code, function(err, tokens) {
				//We should check if the user is in wesleyan.edu domain and if ze is registered in our system
				googleapis.discover('calendar', 'v3').withOpts({cache: {path: './config'}})
					.execute(function(err, client) {
						var auth = new OAuth2Client();
						auth.credentials = tokens;
						client
							.calendar.acl.list({
								calendarId: 'primary',
								fields: "items(id,role)"
							})
							.withAuthClient(auth)
							.execute(function(err, names) {
								if (err) {
									// TODO: After the access_token is refreshed, there should be a new attempt to getCalendar
									if (err.message == "Invalid Credentials") {
										//console.log("Invalid OAuth credentials");
										refreshAccessToken(options, req);
									} else {
										console.log("An error occurred!\n", err);
										options.error(true);
									}
								} else { //Now we have the calendar owner and readers, let's check it
									//find owner, delete 'user:' from id, split to check the user name and domain
									var user = (_.findWhere(names.items, {'role':'owner'}))['id'].substr(5).split('@'); 
									if(user[1] === 'wesleyan.edu' && cache.get('staffUsernameArray').indexOf(user[0]) !== -1 && User.getUser(req) === user[0]) {
										//console.log(user[0] + ' is in Wesleyan domain and in our staff list, and the logged in user');
										req.session.credentials = tokens;
										req.session.refresh_token = tokens.refresh_token;

										//register the refresh token to the database, for that user
										db.staff.update( 
											{username: User.getUser(req)},
											{ $set: {'refresh_token': tokens.refresh_token } }, 
											function(err, updated) {
												if (err || !updated) {
													console.log(req.url);
													console.log("Refresh token not updated:" + err);
												} else {
													//console.log("Refresh token updated for " + User.getUser(req));
													res.write(JSON.stringify(true).toString("utf-8"));
													res.end();
												}
											});
										
										res.redirect('/');
									} else {
										// should explain the user that they have to use their valid wesleyan.edu accounts
										// 		or they are not registered in the Spec system.
										console.log('Something is wrong with this user ' + User.getUser(req));
										res.redirect('/authorize');
									}
								}
							});
					});
			});			
		});
	}

	// Refreshes access_token

	function refreshAccessToken(options, req, callback) {
		//console.log("Refreshing OAuth access token.");
		// check if there is credentials registered in session - (access token expired in usage time)
		// if not(access token expired already) db query to fetch the refresh token for that user
		request.post(
			'https://accounts.google.com/o/oauth2/token', {
				form: {
					client_id: oauth_cache.web.client_id,
					client_secret: oauth_cache.web.client_secret,
					refresh_token: req.session.refresh_token,
					grant_type: 'refresh_token'
				}
			},
			function(error, response) {
				if (error) {
					console.log('Could not refresh OAuth tokens!\n', error);
				}

				// Parse body of http response
				var body = JSON.parse(response.body);
				if (body.error) {
					console.log("Refreshing OAuth token failed!\n", body.error);
					options.error(true);
				} else if (body.access_token) {
					req.session.credentials = body;
					if(_.isFunction(callback)){ callback(); }
				}
			});
	}

	function gCalToFullCalendar(events) {
		return _.map(events, function(event) {
			return {
				title: event.summary,
				start: event.start.dateTime, //FullCalendar can parse ISO8601 date strings
				end: event.end.dateTime,
				backgroundColor: '#7F5417',
				gCal: true, //we could check the bg color in the front end but this way semantically makes more sense
			};
		})
	}

	function overallGoogleCheck(req, res, callback) {
		if (_.isUndefined(req.session.refresh_token)) {
			//check the database for refresh token
				db.staff.find({username:User.getUser(req)}, function(err, data) {
							if(err || !data || data.length < 1) {
								console.log(req.url);
								console.log(err);
								console.log('There is an error when fetching refresh token for the user');
								res.status(404).send('Not found');
								return;
							} else {
								if (_.isUndefined(data[0].refresh_token)) { //if there is no refresh token,
									res.status(404).send('Not found');
									return;
								} else { //if there is one for the user
									req.session.refresh_token = data[0].refresh_token;
									refreshAccessToken({}, req, callback);
								}
							}
						});
		} else {
			if(_.isFunction(callback)){ callback(); }
		}
	}
	app.get('/gCalEvents/', cas.blocker, function(req, res) {
		var start = new Date(req.query.start * 1000),
			end = new Date(req.query.end * 1000);

		var all = function() {
			read_models(req, {
				timeMin: start.toISOString(),
				timeMax: end.toISOString(),
				//timeMin: (new Date).toISOString(), //today
				//timeMax: new Date((new Date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), //next week
				success: function(items) {
					res.json(gCalToFullCalendar(items));
					res.end();
				}
			});
		}
		overallGoogleCheck(req, res, all);

	});

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