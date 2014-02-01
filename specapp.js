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
	var Preferences = require('./config/Preferences.js')
	var express = require('express'),
		app = express(),
		$ = require('jquery'),
		_ = require('underscore'),
		db = require("mongojs").connect(Preferences.databaseUrl, Preferences.collections);
		mongo = require('mongodb-wrapper');
		fs = require('fs');
		cas = require('./modules/grand_master_cas.js'),
		nodemailer = require("nodemailer"),
		async = require('async'),
		ejs = require('ejs');
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
		
	// Template engine tags are changed to {{ }} because underscore uses <% %> as well in the front end
	ejs.open = '{{';
	ejs.close = '}}';

// UTILITY FUNCTIONS
	var Utility = {};
	Utility.sendSingleMail = function(options, callback) {
		var smtpTransport = nodemailer.createTransport("SMTP", {
			service: Preferences.mail.service,
			auth: {
				user: Preferences.mail.user,
				pass: Preferences.mail.pass
			}
		});
		var mailOptions = {
			from: "Wesleyan Spec <wesleyanspec@gmail.com>",
			subject: options.subject,
			html: options.html,
			to: options.to
		};

		smtpTransport.sendMail(mailOptions, function(error, response) {
			if (error) {
				console.log(error);
			} else {
				if(typeof callback === 'function') {callback(response);}
			}
		});
		smtpTransport.close();
	};
	app.locals.formatAMPM = function(date) {
		var hours = date.getHours();
		var minutes = date.getMinutes();
		var ampm = hours >= 12 ? 'PM' : 'AM';
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? '0' + minutes : minutes;
		var strTime = hours + ':' + minutes + ' ' + ampm;
		return strTime;
	};
	app.locals.getFormattedDate = function(date) {
		var year = date.getFullYear();
		var month = (1 + date.getMonth()).toString();
		month = month.length > 1 ? month : '0' + month;
		var day = date.getDate().toString();
		day = day.length > 1 ? day : '0' + day;
		return month + '/' + day + '/' + year;
	};
	app.locals.fixParantheses = function(s) {
		return s.replace("&#35;","#").replace("&#41;",")").replace("&amp;#40;","(");
	};

// STUFF TO LOAD AT INITIATION
	//We can store all staff in memory, since it is not a big array and it will be used VERY frequently, will save time.
	var staffUsernameArray = [];
	db.staff.find({}, function(err, data) {
			if (err || !data) {
				console.log(req.url);
				console.log(err);
			} else {
				app.locals.storeStaff = data;
				app.locals.storeStaff.forEach(function(item) {
					staffUsernameArray.push(item.username);
				});
			}
		});

	//We are storing the inventory in the memory as well
	var allInventory;
	db.inventory.find({}, function(err, data) {
			if (err || !data) {
				console.log(req.url);
				console.log(err);
			} else {
				allInventory = data;
			}
		});
	Utility.inventoryName = function (id) {
		var id = parseInt(id);
		return _.findWhere(allInventory, {'id': id}).text;
	}

// CAS SESSION MANAGEMENT
	function getUser(req) {
		return req.session.cas_user;
	}

	function permission(req) { //returns the permission level of the user in session
		var userObj = $.grep(app.locals.storeStaff, function(e){ return e.username == getUser(req); });
		if(userObj.length < 1) {
			return false;
		} else {
			return userObj[0].level;
		}
	}

	app.get('/login', cas.bouncer, function(req, res) {
		res.redirect('/');
	});

	app.get('/logout', cas.logout);

	app.get("/user", cas.blocker, function(req, res) {
		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
		//req.session.cas_user
		res.write(JSON.stringify({'username':getUser(req), 'permission':permission(req)}).toString("utf-8"));
		res.end();
	});

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
									if(user[1] === 'wesleyan.edu' && staffUsernameArray.indexOf(user[0]) !== -1 && getUser(req) === user[0]) {
										//console.log(user[0] + ' is in Wesleyan domain and in our staff list, and the logged in user');
										req.session.credentials = tokens;
										req.session.refresh_token = tokens.refresh_token;

										//register the refresh token to the database, for that user
										db.staff.update( 
											{username: getUser(req)},
											{ $set: {'refresh_token': tokens.refresh_token } }, 
											function(err, updated) {
												if (err || !updated) {
													console.log(req.url);
													console.log("Refresh token not updated:" + err);
												} else {
													//console.log("Refresh token updated for " + getUser(req));
													res.write(JSON.stringify(true).toString("utf-8"));
													res.end();
												}
											});
										
										res.redirect('/');
									} else {
										// should explain the user that they have to use their valid wesleyan.edu accounts
										// 		or they are not registered in the Spec system.
										console.log('Something is wrong with this user ' + getUser(req));
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
				db.staff.find({username:getUser(req)}, function(err, data) {
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
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			read_models(req, {
				timeMin: start.toISOString(),
				timeMax: end.toISOString(),
				//timeMin: (new Date).toISOString(), //today
				//timeMax: new Date((new Date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), //next week
				success: function(items) {
					res.write(JSON.stringify(gCalToFullCalendar(items)));
					res.end();
				}
			});
		}
		overallGoogleCheck(req, res, all);

	});

// EVENTS
	Utility.fullShiftNumber = function (event) {
		var fullShifts = 0;
		for(var i = 0; i < event.shifts.length; i++) {
			if(event.shifts[i].staff !== '') {
				fullShifts++;
			}
		}
		return fullShifts;
	}
	Utility.addBackgroundColor = function(events) { //changes the events object
		for (index = 0; index < events.length; ++index) {
			event = events[index];
			if(event.techMustStay == false) {
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
	}

	//Event fetching should be filtered according to the time variables, still not done after MongoDB
	app.get("/events", cas.blocker, function(req, res) {
		//86400s = 1d
		var start = new Date(req.query.start * 1000),
			end = new Date(req.query.end * 1000),
			query = {};
		switch(req.query.filter) {
			case 'all':
				query = {};
				break;
			case 'hideCancelled':
				query = {cancelled: false};
				break;
			case 'unstaffed':
				query = {cancelled: false };
				break;
			case 'onlyMine':
				query = {shifts: { $elemMatch: { staff: getUser(req) } }};
				break;
			case 'recentVideo':
				query = {video: true};
				break;
			default:
				query = {};
		}
		$.extend(query, {'start': {$gte: start, $lt: end}});
		db.events.find(query, function(err, events) {
			if (err || !events) {
				console.log(req.url);
				console.log("No events found:" + err);
			} else {
				if(req.query.filter === 'unstaffed') {
					//filter them manually because empty shifts seem like real shifts
					events = _.filter(events, function (event) {
						return Utility.fullShiftNumber(event) < event.staffNeeded;
					});
				}
				events = Utility.addBackgroundColor(events);
				res.write(JSON.stringify(events).toString("utf-8"));
				res.end();
			}
		});

		//req.url
		//console.log("Req for events starting at " + start.toDateString() + " and ending before " + end.toDateString());
		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
		
	});

		app.post("/event/techMustStay", cas.blocker, function(req, res) {
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			if(permission(req) != 10) {
				res.write(JSON.stringify(false).toString("utf-8"));
				res.end();
				return false;
			}
			//req.url
			//console.log("Req for techMustStay toggle Event ID " + req.body.eventid);
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $set: {'techMustStay': JSON.parse(req.body.make) } }, 
				function(err, updated) {
					if (err || !updated) {
						console.log(req.url);
						console.log("Event not techMustStay toggled:" + err);
					} else {
						//console.log("Event techMustStay toggled");
						res.write(JSON.stringify(true).toString("utf-8"));
						res.end();
					}
				});
		});
		app.post("/event/video", cas.blocker, function(req, res) {
			//req.url
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			if(permission(req) != 10) {
				res.write(JSON.stringify(false).toString("utf-8"));
				res.end();
				return false;
			}
			//console.log("Req for techMustStay toggle Event ID " + req.body.eventid);
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $set: {'video': JSON.parse(req.body.make) } }, 
				function(err, updated) {
					if (err || !updated) {
						console.log(req.url);
						console.log("Event not video toggled:" + err);
					} else {
						//console.log("Event video toggled");
						res.write(JSON.stringify(true).toString("utf-8"));
						res.end();
					}
				});
		});
		app.post("/event/audio", cas.blocker, function(req, res) {
			//req.url
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			if(permission(req) != 10) {
				res.write(JSON.stringify(false).toString("utf-8"));
				res.end();
				return false;
			}
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $set: {'audio': JSON.parse(req.body.make) } }, 
				function(err, updated) {
					if (err || !updated) {
						console.log(req.url);
						console.log("Event not audio toggled:" + err);
					} else {
						//console.log("Event audio toggled");
						res.write(JSON.stringify(true).toString("utf-8"));
						res.end();
					}
				});
		});
		app.post("/event/edit", cas.blocker, function(req, res) {
			//req.url
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			if(permission(req) != 10) {
				res.write(JSON.stringify(false).toString("utf-8"));
				res.end();
				return false;
			}
			//console.log("Req for event edit Event ID " + req.body.eventid);
			var query = {};
			$.each(req.body.changedData, function(key, value) {
				if(key == 'title' || key == 'desc' || key == 'loc') {
					query[key] = value;
				}
			});
			var reqDate = new Date(Date.parse(req.body.changedData.date));
			reqDate = (reqDate.getMonth() + 1) + '/' + reqDate.getDate() + '/' +  reqDate.getFullYear() + ' ';
			query.start = new Date(Date.parse(reqDate + req.body.changedData.timepickerResStart));
			query.end = new Date(Date.parse(reqDate + req.body.changedData.timepickerResEnd));
			query.eventStart = new Date(Date.parse(reqDate + req.body.changedData.timepickerEventStart));
			query.eventEnd = new Date(Date.parse(reqDate + req.body.changedData.timepickerEventEnd));
			query.staffNeeded = parseInt(req.body.changedData.staffNeeded);
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $set: query },  //this line consists of editing stuff
				function(err, updated) {
					if (err || !updated) {
						console.log(req.url);
						console.log("Event not edited:" + err);
					} else {
						//console.log("Event edited");
						res.write(JSON.stringify(true).toString("utf-8"));
						res.end();
					}
				});
		});
		app.post("/event/spinner", cas.blocker, function(req, res) {
			//req.url
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			if(permission(req) != 10) {
				res.write(JSON.stringify(false).toString("utf-8"));
				res.end();
				return false;
			}
			//console.log("Req for staffNeeded spinner for Event ID " + req.body.eventid);
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $set: {'staffNeeded': parseInt(req.body.make) } }, 
				function(err, updated) {
					if (err || !updated) {
						console.log(req.url);
						console.log("Event staffNeeded not changed:" + err);
					} else {
						//console.log("Event staffNeeded changed");
						res.write(JSON.stringify(true).toString("utf-8"));
						res.end();
					}
				});
		});
		app.post("/event/cancel", cas.blocker, function(req, res) {
			//req.url
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			if(permission(req) != 10) {
				res.write(JSON.stringify(false).toString("utf-8"));
				res.end();
				return false;
			}
			//console.log("Req for cancel toggle Event ID " + req.body.eventid);
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $set: {'cancelled': JSON.parse(req.body.make) } }, 
				function(err, updated) {
					if (err || !updated) {
						console.log(req.url);
						console.log("Event not cancel toggled:" + err);
					} else {
						//console.log("Event cancel toggled");
						res.write(JSON.stringify(true).toString("utf-8"));
						res.end();
					}
				});
		});
		app.post("/event/remove", cas.blocker, function(req, res) {
			//req.url
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			if(permission(req) != 10) {
				res.write(JSON.stringify(false).toString("utf-8"));
				res.end();
				return false;
			}
			//console.log("Req for remove Event ID " + req.body.eventid);
			db.events.remove(
				{_id: new mongo.ObjectID(req.body.eventid)},
				function(err, removed) {
					if (err || !removed) {
						console.log(req.url);
						console.log("Event not removed:" + err);
					} else {
						//console.log("Event removed");
						res.write(JSON.stringify(true).toString("utf-8"));
						res.end();
					}
				});
		});

	app.get('/print', cas.blocker, function(req, res) {
		//console.log('Req for seeing today\'s events list');
			var today;
			if(req.query.date) {
				try {
					today = new Date(req.query.date);
				} catch(e) {
					res.send(false);
					return false;
				}
			} else {
				today = new Date();
				dateString = (new Date()).toDateString();
			}
			today.setHours(0);
			today.setMinutes(0);
			today.setSeconds(0);
			today.setMilliseconds(0);
		var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

		db.events.find({start: {$gte: today, $lt: tomorrow}, cancelled:false}).sort({start: 1},
			function(err, data) {
					res.render('printtoday', {
						'events': data,
						'dateString': today.toDateString(),
						'Utility': Utility
					});
			});
	});

// API
	app.get('/api/events', function (req, res) {
		try {
			//Allows to set the starting time
			if(req.query.start) {
				var start = new Date(req.query.start * 1000);
			} else {
				//just now if not set
				var start = new Date();
			}

			//Allows to set the ending time
			if(req.query.end) {
				var end = new Date(req.query.end * 1000);
			} else {
				var end = new Date();
				end.setTime(start.getTime() + (30 * 60 * 1000));
			}

			//Shows the events starting in next given number of minutes
			if(req.query.minutes) {
				var start = new Date();
				var end = new Date();
				end.setTime(start.getTime() + (parseInt(req.query.minutes) * 60 * 1000));
			}
		} catch(e) {
			return false;
		}
		if(typeof req.query.filter == 'undefined') {
			req.query.filter = 'hideCancelled';
		}
		query = {};
		switch(req.query.filter) {
			case 'all':
				query = {};
				break;
			case 'hideCancelled':
				query = {cancelled: false};
				break;
			case 'unstaffed':
				query = {cancelled: false };
				break;
			case 'video':
				query = {video: true};
				break;
			default:
				query = {};
		}
		$.extend(query, {'start': {$gte: start, $lt: end}});
		db.events.find(query, function(err, events) {
			if (err || !events) {
				console.log(req.url);
				console.log("No events found:" + err);
			} else {
				if(req.query.filter === 'unstaffed') {
					//filter them manually because empty shifts seem like real shifts
					events = _.filter(events, function (event) {
						return Utility.fullShiftNumber(event) < event.staffNeeded;
					});
				}
				res.write(JSON.stringify(events).toString("utf-8"));
				res.end();
			}
		});

		//req.url
		//console.log("Req for events starting at " + start.toDateString() + " and ending before " + end.toDateString());
		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
	  return;
	});

// TRIVIAL STUFF

	// INVENTORY
		// All inventory
		app.get("/inventory/all", cas.blocker, function(req, res) {
			//req.url
			//console.log("Req for all inventory");
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			res.write(JSON.stringify(allInventory).toString("utf-8"));
			res.end();
		});

		//Existing inventory for each event
		app.get("/inventory/existing/:id", cas.blocker, function(req, res) {
			//req.url
			//console.log("Req for inventory of Event ID " + req.params.id);
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			//Event filtering and inventory
			/*var selectedEvent = events.filter(function(event) {
				return event.id == req.params.id;
			})[0];*/
			db.events.find({_id: new mongo.ObjectID(req.params.id)}, function(err, data) {
				if (err || !data) {
					console.log(req.url);
					console.log("No events found: " + err);
				} else {
					var existingList = [];
					data[0].inventory.forEach(function(id) {
						existingList.push(allInventory.filter(function(tool) {
							return tool.id == id;
						})[0]);
					});
					res.write(JSON.stringify(existingList).toString("utf-8"));
					res.end();
				}
			});
		});

		//Inventory Update
			//Add inventory to an event (POST)
			app.post("/inventory/add", cas.blocker, function(req, res) {
				res.writeHead(200, {
					'Content-Type': 'application/json'
				});
				if(permission(req) < 1) {
					res.write(JSON.stringify(false).toString("utf-8"));
					res.end();
					return false;
				}
				//console.log("Req for adding inventory ID " + req.body.inventoryid + " to Event ID " + req.body.eventid);
				//frontend checks for the same inventory adding, so no control needed for that
				 //try to find the thing by its id and use the same data
				var selectedInventory = allInventory.filter(function(thing) {
					return thing.id == req.body.inventoryid;
				})[0];
				
				db.events.update(
					{_id: new mongo.ObjectID(req.body.eventid)},
					{ $addToSet: {'inventory': req.body.inventoryid} }, 
					function(err, updated) {
						if (err || !updated) {
							console.log(req.url);
							console.log("Inventory not added:" + err);
						} else {
							//console.log("Inventory added");
							res.write(JSON.stringify(true).toString("utf-8"));
							res.end();
						}
					});
			});

			//Remove inventory from an event (POST)
			app.post("/inventory/remove", cas.blocker, function(req, res) {
				res.writeHead(200, {
					'Content-Type': 'application/json'
				});
				if(permission(req) < 1) {
					res.write(JSON.stringify(false).toString("utf-8"));
					res.end();
					return false;
				}
				//console.log("Req for removing inventory ID " + req.body.inventoryid + " from Event ID " + req.body.eventid);
				db.events.update(
					{_id: new mongo.ObjectID(req.body.eventid)},
					{ $pull: {'inventory': req.body.inventoryid } }, 
					function(err, updated) {
						if (err || !updated) {
							console.log(req.url);
							console.log("Inventory not removed:" + err);
						} else {
							//console.log("Inventory removed");
							res.write(JSON.stringify(true).toString("utf-8"));
							res.end();
						}
					});
			});

	// NOTES
		//Existing notes for each event
		app.get("/notes/existing/:id", cas.blocker, function(req, res) {
			//req.url
			//console.log("Req for fetching notes of Event ID " + req.params.id);
			//Event filtering and inventory
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			db.events.find({_id: new mongo.ObjectID(req.params.id)}, function(err, events) {
				if (err || !events) {
					console.log(req.url);
					console.log("No events found: " + err);
				} else {
					res.write(JSON.stringify(events[0].notes).toString("utf-8"));
					res.end();
				}
			});
		});

		//Notes Update
			//Add inventory to an event (POST) - not tested // username is required
			app.post("/notes/add", cas.blocker, function(req, res) {
				//req.url
				res.writeHead(200, {
					'Content-Type': 'application/json'
				});
				//console.log("Req for adding note \"" + req.body.note + "\" to Event ID " + req.body.eventid);
				var generatedID = new mongo.ObjectID();
				db.events.update(
					{_id: new mongo.ObjectID(req.body.eventid)},
					{ $addToSet: {'notes': {'id': generatedID, 'text': req.body.note,'user': getUser(req), 'date': new Date()}} }, 
					function(err, updated) {
						if (err || !updated) {
							console.log(req.url);
							console.log("Note not added:" + err);
						} else {
							//console.log("Note added");
							res.write(JSON.stringify({'id':generatedID.toString(), 'user':getUser(req)}).toString("utf-8"));
							res.end();
						}
					});
			});

			//Remove inventory from an event (POST) - username is required for verification
				//managers should be able to delete any comment, others should only be able to delete their own
			app.post("/notes/remove", cas.blocker, function(req, res) {
				//req.url
				res.writeHead(200, {
					'Content-Type': 'application/json'
				});
				//console.log("Req for removing note ID " + req.body.id + " from Event ID " + req.body.eventid);
				var deleteNote = function() {
					db.events.update(
						{_id: new mongo.ObjectID(req.body.eventid)},
						{ $pull: {'notes': {'id': new mongo.ObjectID(req.body.id)} } }, 
						function(err, updated) {
							if (err || !updated) {
								console.log(req.url);
								console.log("Note not removed:" + err);
							} else {
								//console.log("Note removed");
								res.write(JSON.stringify(true).toString("utf-8"));
								res.end();
							}
						});
				};
				if(permission(req) == 10) { //remove the note if it's a manager
					deleteNote();
				} else {
					db.events.find({_id: new mongo.ObjectID(req.body.eventid)}, function(err, events) {
						if (err || !events) {
							console.log(req.url);
							console.log(err);
						} else if(events.length < 1) {
							console.log("No such note/event found");
						} else {
							var theNote = $.grep(events[0].notes, function(e){ return e['_id'] == req.body.id; });
							if(theNote.user == getUser(req)) {
								deleteNote();
							} else {
								res.write(JSON.stringify(false).toString("utf-8"));
								res.end();
								return false;
							}
						}
					});
				}
			});

	// STAFF
		//All event staff in IMS
		app.get("/staff/all", cas.blocker, function(req, res) {
			
			//req.url
			//console.log("Req for all staff info");
			// Filter the events/database and return the staff and shifts info (requires to decide on db structure)
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			res.write(JSON.stringify(app.locals.storeStaff).toString("utf-8"));
			res.end();
		});
		//Get the existing staff of an event
		app.get("/staff/get/:id", cas.blocker, function(req, res) {
			
			//req.url
			//console.log("Req for staff info of Event ID " + req.params.id);
			// Filter the events/database and return the staff and shifts info (requires to decide on db structure)
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			db.events.find({_id: new mongo.ObjectID(req.params.id)}, function(err, events) {
				if (err || !events) {
					console.log(req.url);
					console.log("No events found");
				} else {
					res.write(JSON.stringify(events[0].shifts).toString("utf-8"));
					res.end();
				}
			});
		});
		//Add staff/shift to an event (POST)
			app.post("/staff/add", cas.blocker, function(req, res) {
				//req.url
				res.writeHead(200, {
					'Content-Type': 'application/json'
				});
				var chosenStaff = req.body.staff;
				if(staffUsernameArray.indexOf(getUser(req)) === -1) { //if user is not in staff list, don't allow
					res.write(JSON.stringify(false).toString("utf-8"));
					res.end();
					return false;
				}
				if(permission(req) != 10) {
					chosenStaff = getUser(req); //this will only add 
				}
				//console.log("Req for adding shift \"" + chosenStaff + "\" to Event ID " + req.body.eventid);
				var eventStart = new Date(Date.parse(req.body.eventStart)),
					eventEnd = new Date(Date.parse(req.body.eventEnd)),
					generatedID = new mongo.ObjectID(),
					startDate = new Date(Date.parse(eventStart.getFullYear() + "-" + (eventStart.getMonth()+1) + "-" + eventStart.getDate() + " " +req.body.start)),
					endDate = new Date(Date.parse(eventEnd.getFullYear() + "-" + (eventStart.getMonth()+1) + "-" + eventEnd.getDate() + " " +req.body.end)),
					newShift = {'id': generatedID, 'start': startDate,'end': endDate, 'staff': chosenStaff};
				db.events.findAndModify({
									query: {_id: new mongo.ObjectID(req.body.eventid)},
									update: { $addToSet: {'shifts': newShift} }, 
									new: true
								},
					function(err, updated) {
						if (err || !updated) {
							console.log(req.url);
							console.log("Shift not added:" + err);
						} else {
							//console.log("Shift added");
							res.write(JSON.stringify({'id':generatedID.toString(),'start':startDate, 'end':endDate}).toString("utf-8"));
							res.end();
							if(chosenStaff === '') { return; }
							Utility.sendSingleMail({
								to: chosenStaff + '@wesleyan.edu',
								subject:'You have a new shift! : ' + updated.title,
								html: ejs.render(fs.readFileSync(__dirname + '/views/mail/newShift.ejs', 'utf8'), {'app': app, 'event': updated, 'shift': newShift})
							});
						}
					});
			});
		//Remove staff/shift from an event (POST)
			app.post("/staff/remove", cas.blocker, function(req, res) {
				res.writeHead(200, {
					'Content-Type': 'application/json'
				});
				var query = {'shifts': {'id': new mongo.ObjectID(req.body.id)} };
				if(permission(req) != 10) { //users other than the manager 
					query['shifts']['staff'] = getUser(req);
				}
				//console.log("Req for removing shift ID " + req.body.id + " from Event ID " + req.body.eventid);
				db.events.findAndModify({
									query: {_id: new mongo.ObjectID(req.body.eventid)},
									update: { $pull: query }, 
									new: false //return the data before the update
								},
					function(err, updated) {
						if (err || !updated) {
							console.log(req.url);
							console.log("Shift not removed:" + err);
						} else {
							//console.log("Shift removed");
							res.write(JSON.stringify(true).toString("utf-8"));
							res.end();
							//below is needed because id's are ObjectID, so we convert them to string to compare with req.body.id
							updated.shifts = updated.shifts.map(function(shift) {
								shift.id = shift.id + '';
								return shift;
							});
							var oldShift = _.findWhere(updated.shifts, {'id': req.body.id});
							if(_.isUndefined(oldShift)) {
								console.log('old shift could not be found');
								return false;
							}

							//store the removed shift somewhere, just in case someone deletes their shift just before the event or something
							db.removedShifts.save(oldShift, function(err, saved) {
														if (err || !saved) {
															console.log("Removed shift could not be added");
														}
													});

							if(oldShift.staff === '') { return; }
							Utility.sendSingleMail({
								to: oldShift.staff + '@wesleyan.edu',
								subject:'You have a removed shift! : ' + updated.title,
								html: ejs.render(fs.readFileSync(__dirname + '/views/mail/removeShift.ejs', 'utf8'), {'app': app, 'event': updated, 'shift': oldShift})
							});
						}
					});
			});
		//Sign up for an empty shift for an event (POST)
			app.post("/staff/shiftsignup", cas.blocker, function(req, res) {
				res.writeHead(200, {
					'Content-Type': 'application/json'
				});

				//find the data to be updated (before update!)
				db.events.findOne({_id: new mongo.ObjectID(req.body.eventid)},
					function(err, updated) {
						if (err || !updated) {
							console.log(req.url);
							console.log("Could not find after update:" + err);
						} else {
							//below is needed because id's are ObjectID, so we convert them to string to compare with req.body.id
							updated.shifts = updated.shifts.map(function(shift) {
														shift.id = shift.id + '';
														return shift;
													});
							var signedUpShift = _.findWhere(updated.shifts, {'id': req.body.id});
							if(_.isUndefined(signedUpShift)) {
								console.log('the shift could not be found');
								return false;
							} else if(signedUpShift.staff !== '') {
								console.log('someone is trying to sign up for a shift that already has a staff!');
								return false;
							}
							//it is safe to update now
							db.events.update({_id: new mongo.ObjectID(req.body.eventid), 'shifts.id': new mongo.ObjectID(req.body.id)},
											 {$set: {'shifts.$.staff': getUser(req)}},
											 function(err, ifUpdated) {
												if (err || !ifUpdated) {
													console.log(req.url);
													console.log("Shift not signed up:" + err);
												} else {
													res.write(JSON.stringify(true).toString("utf-8"));
													res.end();
													
													//now send e-mails
													Utility.sendSingleMail({
														to: signedUpShift.staff + '@wesleyan.edu',
														subject:'You have a new shift! : ' + updated.title,
														html: ejs.render(fs.readFileSync(__dirname + '/views/mail/newShift.ejs', 'utf8'), {'app': app, 'event': updated, 'shift': signedUpShift})
													});
												}
											}); //end of update
						}
					});				
				//console.log("Req for signing up shift ID " + req.body.id + " from Event ID " + req.body.eventid);
			});
		//Withdrawing from a shift for an event (POST)
			app.post("/staff/withdraw", cas.blocker, function(req, res) {
					res.writeHead(200, {
						'Content-Type': 'application/json'
					});

					//find the data to be updated (before update!)
					db.events.findOne({_id: new mongo.ObjectID(req.body.eventid)},
						function(err, updated) {
							if (err || !updated) {
								console.log(req.url);
								console.log("Could not find after update:" + err);
							} else {
								//below is needed because id's are ObjectID, so we convert them to string to compare with req.body.id
								updated.shifts = updated.shifts.map(function(shift) {
															shift.id = shift.id + '';
															return shift;
														});
								var withdrawnShift = _.findWhere(updated.shifts, {'id': req.body.id});
								if(_.isUndefined(withdrawnShift)) {
									console.log('the shift could not be found');
									return false;
								} else if(withdrawnShift.staff !== getUser(req)) {
									console.log('someone is trying to withdraw for a shift that is not theirs!');
									return false;
								}
								//it is safe to update now
								db.events.update({_id: new mongo.ObjectID(req.body.eventid), 'shifts.id': new mongo.ObjectID(req.body.id)},
												 {$set: {'shifts.$.staff': ''}},
												 function(err, ifUpdated) {
													if (err || !ifUpdated) {
														console.log(req.url);
														console.log("Shift not withdrawn:" + err);
													} else {
														res.write(JSON.stringify(true).toString("utf-8"));
														res.end();
														
														//now send e-mails
														Utility.sendSingleMail({
															to: withdrawnShift.staff + '@wesleyan.edu',
															subject:'You have a removed shift! : ' + updated.title,
															html: ejs.render(fs.readFileSync(__dirname + '/views/mail/removeShift.ejs', 'utf8'), {'app': app, 'event': updated, 'shift': withdrawnShift})
														});
														//store the removed shift somewhere, just in case someone deletes their shift just before the event or something
															db.removedShifts.save(withdrawnShift, function(err, saved) {
																	if (err || !saved) {
																		console.log("Removed shift could not be added");
																	}
																});
													}
												}); //end of update
							}
						});				
					//console.log("Req for withdrawing shift ID " + req.body.id + " from Event ID " + req.body.eventid);
				});

			//this is determined by staff time checking, not shift time checking, therefore if 
			app.get("/staff/available/today", cas.blocker, function(req, res) {
				var busyStaff = [];
				//86400s = 1d
				var start = new Date(req.query.start * 1000),
					end = new Date(req.query.end * 1000);
				//console.log("Req for staff available starting at " + start.toDateString() + " and ending before " + end.toDateString());
				res.writeHead(200, {
					'Content-Type': 'application/json'
				});
				var query = {};
				$.extend(query, {'start': {$gte: start, $lt: end}});
				db.events.find(query, function(err, events) {
					if (err || !events) {
						console.log(req.url);
						console.log("No events found");
					} else {
						events.forEach(function(event) {
							event.shifts.forEach(function(shift) {
								busyStaff.push(shift.staff);
							});
						});
						var availableStaff = $(staffUsernameArray).not(busyStaff).get();
						res.write(JSON.stringify(availableStaff).toString("utf-8"));
						res.end();
					}	
				});
			});

			app.get("/staff/check", cas.blocker, function(req, res) {
				if(permission(req) != 10) {
					res.write(JSON.stringify(false).toString("utf-8"));
					res.end();
					return false;
				}
				var start = new Date(Date.parse(req.query.start)),
					end = new Date(Date.parse(req.query.end));
				end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
				//console.log(start);
				//console.log("Req for staff check for " + req.query.user);
				db.events.find({'start': {$gte: start, $lt: end}, 'shifts':{$elemMatch: {'staff': req.query.user}},}, function(err, events) {
					if (err || !events) {
						console.log(req.url);
						console.log("No events found" + err);
						res.write(JSON.stringify(false).toString("utf-8"));
						res.end();
					} else {
						res.write(JSON.stringify(events).toString("utf-8"));
						res.end();
					}
				});
			});
			app.get("/staff/table", cas.blocker, function(req, res) {
				if(permission(req) != 10) {
					res.write(JSON.stringify(false).toString("utf-8"));
					res.end();
					return false;
				}
				var start = new Date(Date.parse(req.query.start)),
					end = new Date(Date.parse(req.query.end));
				end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
				//console.log(start);
				//console.log("Req for staff table for " + req.query.user);
				db.events.find({'start': {$gte: start, $lt: end},}, function(err, events) {
					if (err || !events) {
						console.log(req.url);
						console.log("No events found" + err);
						res.write(JSON.stringify(false).toString("utf-8"));
						res.end();
					} else {
						var result = {};
						events.forEach(function(event) {
							event.shifts.forEach(function(shift) {
								if(shift.staff === "") { return; }
								result[shift.staff] = (typeof result[shift.staff] === 'undefined') ? {} : result[shift.staff];
								result[shift.staff].hour = (typeof result[shift.staff].hour === 'undefined') ? 0 : result[shift.staff].hour;
								result[shift.staff].event = (typeof result[shift.staff].event === 'undefined') ? 0 : result[shift.staff].event;
								result[shift.staff].event += 1;
								result[shift.staff].hour += ((Date.parse(shift.end) - Date.parse(shift.start)) / 3600000);
							})
						});
						res.write(JSON.stringify(result).toString("utf-8"));
						res.end();
					}
				});
			});
			app.get('/staffCheck', cas.blocker, function (req, res) {
				if(permission(req) != 10) {
					res.write(JSON.stringify(false).toString("utf-8"));
					res.end();
					return false;
				}
				//console.log("Req for staff check");
				  res.render('staffCheck',
					{
						//users: app.locals.,
					});
				});

			app.get('/staffTable', cas.blocker, function (req, res) {
				if(permission(req) != 10) {
					res.write(JSON.stringify(false).toString("utf-8"));
					res.end();
					return false;
				}
				//console.log("Req for staff check");
				  res.render('staffTable',
					{
						//users: app.locals.,
					});
				});

// FILE UPLOAD
	app.get('/fileUpload', cas.blocker, function(req, res) {
		if(permission(req) != 10) {
			res.write(JSON.stringify(false).toString("utf-8"));
			res.end();
			return false;
		}
		var lastInfo = ['',''];
		try {
			var readFile = fs.readFileSync(__dirname + Preferences.path_last_upload_info); //see the last upload time & user
			lastInfo = readFile.toString().split('&');
		} catch(e) {}
	 	res.render('upload', {lastUploadTime: lastInfo[0], lastUploadUser: lastInfo[1]});
	});

	app.post('/fileUpload', cas.blocker, function(req, res) {
		var today = new Date(); today.setHours(0,0,0,0),
			twoWeeksLater = new Date((new Date).getTime() + 2 * 7 * 24 * 60 * 60 * 1000); twoWeeksLater.setHours(23,59,59,999);
		db.events.find({'start': {$gte: today, $lt: twoWeeksLater}}, function(err, events) {
			if (err || !events) {
				console.log(req.url);
				console.log("No events found" + err);
			} else {
				// events loaded. let's check for every event

					var parser = require('xml2json');
					if(permission(req) != 10) {
						res.write(JSON.stringify(false).toString("utf-8"));
						res.end();
						return false;
					}
					console.log('Upload and saving progress started');
					//you should check if it's an xml file
					try {
						// Freshly uploaded XML and last.xml are read
							var xml = fs.readFileSync(req.files.myFile.path),
								last = fs.readFileSync(__dirname + Preferences.path_last_xml);
						// Both XML files are parsed
							xml = parser.toJson(xml, {
								object: true,
								trim: true,
								arrayNotation: true
							})['CopyofIMSforExport']['Data'];
							last = parser.toJson(last, {
								object: true,
								trim: true,
								arrayNotation: true
							})['CopyofIMSforExport']['Data'];
							if(last == 0) {last = [];} //this is only for the first setup of spec on any machine

						var whatToChange = { update: [], add: [], remove: events };
						console.log(xml.length + ' events in the new XML file');
						console.log(last.length + ' events in the last XML file');
						// Parsed XML files are compared according to their unique ID's, event by event
						xml.forEach(function(xmlEntry) {
							//try to find an object with the same unique ID
							var entryInLast = _.findWhere(last, {
								'Service_x0020_Order_x0020_Detail_x0020_ID': xmlEntry['Service_x0020_Order_x0020_Detail_x0020_ID']
							});
							if (!_.isUndefined(entryInLast)) { //if exists, then compare if they are the same
								if(!_.isEqual(xmlEntry, entryInLast)) {
									whatToChange.update.push(xmlEntry); //if they are the same, store to update later
								}
							} else { //if it doesn't exist in the last.xml, then store it to add later.
								whatToChange.add.push(xmlEntry);
							}
							/*
							find the event with the same XMLid, delete that event from the array
							the remaining events are apparently deleted from EMS
							*/
							whatToChange.remove = _.reject(whatToChange.remove, function(el) { return el['XMLid'] === xmlEntry['Service_x0020_Order_x0020_Detail_x0020_ID']; });
						});
						//should write a part that distinguishes new events and updated events.
						var process = function(data) {
							var bookingDate = data['Booking_x0020_Date'].split(" ")[0],
								reservedStart = new Date(Date.parse(bookingDate + ' ' + data['Reserved_x0020_Start'])),
								reservedEnd = new Date(Date.parse(bookingDate + ' ' + data['Reserved_x0020_End'])),
								eventStart = new Date(Date.parse(bookingDate + ' ' + data['Event_x0020_Start'])),
								eventEnd = new Date(Date.parse(bookingDate + ' ' + data['Event_x0020_End'])),
								desc = data['Notes'];
							if(_.isObject(desc)) { desc = '' }; //if it's an object rather than a string, make it a blank string

							var cancelled = false;
							if (data['Booking_x0020_Status'] == 'Cancelled') {
								cancelled = true;
							}
							var video = false;
							['video','recording'].forEach(function(word) {
								if(String(data['Notes']).indexOf(word) != -1) {
									video = true;
								}
							});
							return {
								XMLid: data['Service_x0020_Order_x0020_Detail_x0020_ID'],
								title: data['Event_x0020_Name'],
								desc:  desc,
								loc:   data['Room_x0020_Description'],
								start: reservedStart,
								end:   reservedEnd,
								'eventStart': eventStart,
								'eventEnd':   eventEnd,
								'cancelled':  cancelled,
								techMustStay: true,
								'audio': false,
								'video':  video,
								customer: {
									'name':  data['Customer'],
									'phone': data['Customer_x0020_Phone_x0020_1'],
								}
							};
						};

						var cleanSheet = function(data) { //these are for the new events to be added.
							data.inventory = [];
							data.notes = [];
							data.shifts = [];
							data.staffNeeded = 1;
							return data;
						}

						whatToChange.update = whatToChange.update.map(process);
						whatToChange.add = whatToChange.add.map(process).map(cleanSheet);

						var changeNumbers = {add:0, update:0, remove: 0},
							parallel = [],
							whatToReport = {update:[], remove: whatToChange.remove};
						//push update functions in an array, in order to have a final callback function to end response after the async.parallel process
						whatToChange.add.forEach(function(event) { 
							parallel.push(function(callback) {
													db.events.save(event, function(err, saved) {
														if (err || !saved) {
															console.log("New event is not saved");
														} else {
															changeNumbers.add++;
															callback();
														}
													});
												});
						});

						whatToChange.update.forEach(function(event) {
							parallel.push(function(callback) {
													db.events.findAndModify({
														query: {XMLid: event.XMLid},
														update: {$set: event }, 
														new: true
													},
													function(err, updated) {
														if (err || !updated) {
															console.log("Event could not be updated: " + err);
															console.log(event.title);
														} else {
															changeNumbers.update++;
															whatToReport.update.push(updated);
															callback();
														}
													});
												});
						});

						whatToChange.remove.forEach(function(event) { //events removed from EMS detected, now delete them from db
							parallel.push(function(callback) {
													db.events.remove(
														{XMLid: event.XMLid},
														function(err, removed) {
															if (err || !removed) {
																console.log("Event could not be removed:" + err);
																console.log(event.title);
															} else {
																changeNumbers.remove++;
																callback();
															}
														});
												});
						});


						async.parallel(parallel, function() {
							console.log("Upload and saving progress ended successfully");
							res.writeHead(200);
							res.write(changeNumbers.add + ' events added, ' + changeNumbers.update + ' updated and ' + changeNumbers.remove + ' removed, upload and saving progress ended successfully.');
							res.end();
							// delete the old last.xml file and rename the new uploaded file as last.xml
							(function(path) {
								fs.unlink(__dirname + Preferences.path_last_xml, function(err) {
									if (err) {
										console.log(err);
										return false;
									}
									console.log('Old last.xml file successfully deleted');
									fs.rename(path, __dirname + Preferences.path_last_xml, function(err) {
										if (err) throw err;
										console.log('Uploaded file renamed to last.xml');
									});
								});
							})(req.files.myFile.path);
							reportUpdate(whatToReport); //send messages to the staff and managers
							fs.writeFileSync(__dirname + Preferences.path_last_upload_info, (new Date() + '&' + getUser(req))); //store the last upload time & user
						});
					} catch (err) {
						// delete the newly uploaded file because there is no need to store it
						if(!_.isUndefined(req.files)) { //if there is actually a file, then delete it
							(function(path) {
								console.log(path);
								fs.unlink(path, function(err) {
									if (err) {
										console.log(err);
										return false;
									}
									console.log('File with error successfully deleted');
								});
							})(req.files.myFile.path);
						} else {
							console.log('There is no file uploaded.');
						}
						console.log(err);
						//res.writeHead(400);
						res.end();
						return false;
					}

				// first db query and if else, and other functions end
			}
		});		
	});

	//this will send messages to the managers and the people who are registered in those events
	function reportUpdate(whatToReport) {
		if(whatToReport.update.length < 1 && whatToReport.remove.length < 1) {return false;} //don't send any mail if there is no change
		//not using a function for e-mail sending because we need to close the connection after all stuff

		// create reusable transport method (opens pool of SMTP connections)
		var smtpTransport = nodemailer.createTransport("SMTP", {
		    service: Preferences.mail.service,
		    auth: {
		        user: Preferences.mail.user,
		        pass: Preferences.mail.pass
		    }
		});
		//we have an object {update:[], remove:[]}, and the update array has the these events
		var whatToSend = {},
			parallel = [];
		whatToReport.update.forEach(function(event) {
			parallel.push(function(callback) {
				event.shifts.forEach(function(shift) {
					if(_.isUndefined(whatToSend[shift.staff])) { whatToSend[shift.staff] = {remove:[], update:[]}; }
					whatToSend[shift.staff].update.push({'event': event, 'shift': shift}); //this is the structure of the array elements, be careful
				});
				callback();
			});
		});
		whatToReport.remove.forEach(function(event) {
			parallel.push(function(callback) {
				event.shifts.forEach(function(shift) {
					if(_.isUndefined(whatToSend[shift.staff])) { whatToSend[shift.staff] = {remove:[], update:[]}; }
					whatToSend[shift.staff].remove.push({'event': event, 'shift': shift}); //this is the structure of the array elements, be careful
				});
				callback();
			});
		});
		async.parallel(parallel, function() {
			//now we have a complete whatToSend object, so we can start to send notifications

			_.each(whatToSend, function(items, user) {
				var staffMailOptions = {
				    from: "Wesleyan Spec <wesleyanspec@gmail.com>",
				    to: user + "@wesleyan.edu",
				    subject: "Updated Event for " + user + " (IMPORTANT)",
				};

				staffMailOptions.html = ejs.render(fs.readFileSync(__dirname + '/views/mail/normalUpdate.ejs', 'utf8'), {'app': app, 'items': items});

				smtpTransport.sendMail(staffMailOptions, function(error, response) {
				    if (error) {
				        console.log(error);
				    } else {
				        //console.log("Message sent: " + response.message);
				    }
				});
			});
			
		}); //end of async.parallel

		//now it's time to report all updates to the managers (all staff with level 10), with whatToReport
			
			//var managerList = _.where(app.locals.storeStaff, {level:10});
			var managerList = Preferences.managerEmails;

				managerMailOptions = {
					    from: "Wesleyan Spec <wesleyanspec@gmail.com>",
					    subject: "General Event Update Report (IMPORTANT)",
					};

			managerMailOptions.html = ejs.render(fs.readFileSync(__dirname + '/views/mail/managerUpdate.ejs', 'utf8'), {'app': app, 'items': whatToReport});
			managerList.forEach(function (manager) {
				managerMailOptions.to = manager.username + "@wesleyan.edu"
				smtpTransport.sendMail(managerMailOptions, function(error, response) {
					    if (error) {
					        console.log(error);
					    } else {
					        //console.log("Message sent: " + response.message);
					    }
					});
			});

		//smtpTransport.close(); //this should wait for the callbacks to end
	} //end of reportUpdate

// MAIN PAGE RENDERING
	app.get('/', cas.blocker, function (req, res) {
		if(req.query.ticket) {
			res.redirect('/'); //redirect to the base if there is a ticket in the URL
		}
		var currentUser = _.findWhere(app.locals.storeStaff, { 'username': getUser(req) });
		if(_.isUndefined(currentUser)) { //the user is not in the staff database
			res.render('notStaff', {cas_user: getUser(req)});
		} else {
			res.render('index', {
				username: currentUser.username,
				permission: currentUser.level,
				staffname: currentUser.name,
			});
		}
	});

// MOBILE
	app.get('/m', cas.blocker, function (req, res) {
		if(req.query.ticket) {res.redirect('/m/');} //redirect to the base if there is a ticket in the URL
		res.redirect('/m/0/');
	});
	app.get('/m/:counter/', cas.blocker, function (req, res) {
		var today = new Date();
		today.setHours(0);
		today.setMinutes(0);
		today.setSeconds(0);
		today.setMilliseconds(0);
		var start = new Date(today.getTime() + 24 * 60 * 60 * 1000 * req.params.counter),
			end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
		
		var title = '';
		if (req.params.counter == 0) {
			title = 'Today';
		} else if (req.params.counter == -1) {
			title = 'Yesterday';
		} else if(req.params.counter == 1) {
			title = 'Tomorrow';
		} else {
			title = app.locals.getFormattedDate(start);
		}
		query = {};
		$.extend(query, {'start': {$gte: start, $lt: end}});
		db.events.find(query, function(err, events) {
			if (err || !events) {
				console.log(req.url);
				console.log("No events found" + err);
			} else {
				
				res.render('mobile/index', {
					username: getUser(req),
					permission: permission(req),
					events: events,
					counter: req.params.counter,
					title:title,
				});
			}
		});	
	});
	app.get('/m/event/:id', cas.blocker, function (req, res) {
		query = {};
		$.extend(query, {'_id': new mongo.ObjectID(req.params.id)});
		db.events.find(query, function(err, events) {
			if (err || !events) {
				console.log(req.url);
				console.log("No events found" + err);
			} else {
				res.render('mobile/event', {
					username: getUser(req),
					permission: permission(req),
					event: events[0],
				});
			}
		});	
	});

	app.get('/m/staff/:username', cas.blocker, function (req, res) {
		var userObj = $.grep(app.locals.storeStaff, function(e){ return e.username == req.params.username; });
		if(userObj.length != 1) {
			res.end();
			return false;
		}
		res.render('mobile/staff', {
			username: getUser(req),
			permission: permission(req),
			staff: userObj[0],
		});
	});

// TEXT REMINDERS
	setInterval(function() {
		//check if there is an event starting in 5 min
		var fiveMinCheck = {'start': {$gte: new Date((new Date()).getTime() + 55*60*1000), $lt: new Date((new Date()).getTime() + 60*6*10000)}};
		db.events.find(fiveMinCheck, function(err, events) {
			if (err || !events) {
				console.log(req.url);
				console.log(err);
			} else {
				var providers = ['vtext.com', 'txt.att.net', 'tomomail.net', 'messaging.sprintpcs.com', 'vmobl.com'];
				//not using a function for e-mail sending because we need to close the connection after all stuff
				var smtpTransport = nodemailer.createTransport("SMTP", {
				    service: Preferences.mail.service,
				    auth: {
				        user: Preferences.mail.user,
				        pass: Preferences.mail.pass
				    }
				});
				events.forEach(function(event) {
					event.shifts.forEach(function(shift) {
						var phone = _.findWhere(app.locals.storeStaff, {'username': shift.staff});
						if(_.isUndefined(phone) || phone == false || phone.toString().length !== 10) {
							return false;
						}
						var mailOptions = {
						    from: "Wesleyan Spec <wesleyanspec@gmail.com>",
						    subject: "Text reminder for " + user,
						};
						mailOptions.html = ejs.render(fs.readFileSync(__dirname + '/views/mail/textReminder.ejs', 'utf8'), {'app': app, 'event':event,'shift':shift});
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
	}, 1000 * 60 * 5); //every 5 minutes

// STARTING THE SERVER
	app.listen(Preferences.port, function() {
		console.log("Express server listening on port " + Preferences.port);
	});
	/* //options should have SSL certificates
	https.createServer(options, app).listen(Preferences.port, function() {
		console.log("Express server listening on port " + Preferences.port);
	});
	*/