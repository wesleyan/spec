/*
  ____                     
 / ___|  _ __    ___   ___ 
 \___ \ | '_ \  / _ \ / __|
  ___) || |_) ||  __/| (__ 
 |____/ | .__/  \___| \___|
        |_|                
*/
// CONFIGURATION AND MODULES
	var Preferences = {
		//general preferences
		debug: true, //making it false will overwrite console.log
		path_last_xml: './uploads/last.xml',
		port: 8080,

		//MongoDB preferences
		databaseUrl: "127.0.0.1:27017/spec",
		collections: ['events','staff']
	}

	require('ofe').call();
	var express = require('express');
	var app = express();
	var $ = require('jquery');
	var _ = require('underscore');
	var db = require("mongojs").connect(Preferences.databaseUrl, Preferences.collections);
	var mongo = require('mongodb-wrapper');
	var fs = require('fs');
	var cas = require('./modules/grand_master_cas.js');

	//CAS Configurations
	cas.configure({
		casHost: 'sso.wesleyan.edu',
		ssl: true,
		service: 'http://ims-dev.wesleyan.edu:8080/',
		redirectUrl: '/login'
	});
	var async = require('async');

	app.configure(function() {
		app.set('views', __dirname + '/views');
		app.set('view engine', 'ejs');
		app.use(express.bodyParser({keepExtensions: true, uploadDir:'uploads'}));
		app.use(express.methodOverride());
		app.use(express.cookieParser('secret'));
		app.use(express.session());
		app.use(app.router);
		app.use(express.static(__dirname + '/public'));
	});
	var ejs = require('ejs');
	// Template engine tags are changed to {{ }} because underscore uses <% %> as well in the front end
	ejs.open = '{{';
	ejs.close = '}}';

// STUFF TO LOAD AT INITIATION
	//We can store all staff in memory, since it is not a big array and it will be used VERY frequently, will save time.
	var staffUsernameArray = [];
	db.staff.find({}, function(err, data) {
			if (err || !data) {
				console.log("No events found");
			} else {
				app.locals.storeStaff = data;
				app.locals.storeStaff.forEach(function(item) {
					staffUsernameArray.push(item.username);
				});
			}
		});

	var allInventory = [
		{
			"id": 4,
			"text": "Video Camera",
			"title": "This item needs to be recorded."
		}, {
			"id": 6,
			"text": "Camera",
			"title": "This item needs to be recorded."
		}, {
			"id": 7,
			"text": "Tripod",
			"title": "This item needs to be recorded."
		}, {
			"id": 5,
			"text": "HDMI Cable",
			"title": "This item needs to be recorded."
		}, {
			"id": 1,
			"text": "Projector",
			"title": "This item needs to be recorded."
		},	{
			"id": 2,
			"text": "Macbook Pro 13",
			"title": "This item needs to be recorded."
		}, {
			"id": 3,
			"text": "iMac 21.5",
			"title": "This item needs to be recorded."
		}
	];

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
		
		//req.url
		console.log("Req for session user");
		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
		//req.session.cas_user
		res.write(JSON.stringify({'username':getUser(req), 'permission':permission(req)}).toString("utf-8"));
		res.end();
	});

// GOOGLE CALENDAR INTEGRATION
	var request = require('request');
	var googleapis = require('googleapis');

	var OAuth2Client = googleapis.OAuth2Client;
	var oauth_cache = {};

	//this one must match with the one you have saved in https://code.google.com/apis/console
	var REDIRECT_URL = 'http://ims-dev.wesleyan.edu:8080/oauth2callback'; 
	try {
	oauth_cache = JSON.parse(fs.readFileSync('./config/client_secret.json', 'utf8'));
	} catch (e) {
		console.log("Could not read client_secret.json from the config directory\nError: " + e);
	}

	// TODO: Replace with or add a button on frontend
	app.get('/authorize', function(req, res) {
		//if we have the refresh token for the user, then we just need to refreshAccessToken, otherwise take permission
		var oauth2Client = new OAuth2Client(oauth_cache.web.client_id, oauth_cache.web.client_secret, REDIRECT_URL);
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
						console.log("Invalid OAuth credentials");
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
		app.get('/oauth2callback', function(req, res) {
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
										console.log("Invalid OAuth credentials");
										refreshAccessToken(options, req);
									} else {
										console.log("An error occurred!\n", err);
										options.error(true);
									}
								} else { //Now we have the calendar owner and readers, let's check it
									//find owner, delete 'user:' from id, split to check the user name and domain
									var user = (_.findWhere(names.items, {'role':'owner'}))['id'].substr(5).split('@'); 
									if(user[1] === 'wesleyan.edu' && staffUsernameArray.indexOf(user[0]) !== -1 && getUser(req) === user[0]) {
										console.log(user[0] + ' is in Wesleyan domain and in our staff list, and the logged in user');
										req.session.credentials = tokens;
										req.session.refresh_token = tokens.refresh_token;

										//register the refresh token to the database, for that user
										db.staff.update( 
											{username: getUser(req)},
											{ $set: {'refresh_token': tokens.refresh_token } }, 
											function(err, updated) {
												if (err || !updated) {
													console.log("Refresh token not updated:" + err);
												} else {
													console.log("Refresh token updated for " + getUser(req));
													res.write(JSON.stringify(true).toString("utf-8"));
													res.end();
												}
											});
										
										res.redirect('/gCalEvents');
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
		console.log("Refreshing OAuth access token.");
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

	function overallGoogleCheck(req, callback) {
		if (_.isUndefined(req.session.refresh_token)) {
			//check the database for refresh token
			db.staff.find({username:getUser(req)}, function(err, data) {
				if(err || !data) {
					console.log('There is an error when fetching refresh token for the user');
					return false;
				} else {
					console.log(data);
					if (_.isUndefined(data.refresh_token)) { //if there is no refresh token,
						return false;
					} else { //if there is one for the user
						req.session.refresh_token = data.refresh_token;
						refreshAccessToken({}, req, callback);
					}
				}
			});
		} else {
			if(_.isFunction(callback)){ callback(); }
		}
	}
	app.get('/gCalEvents', function(req, res) {
		var all = function() {
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			read_models(req, {
				timeMin: (new Date).toISOString(),
				timeMax: new Date((new Date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				success: function(items) {
					res.write(JSON.stringify(items));
					res.end();
				}
			});
		}
		if(overallGoogleCheck(req, all) === false) {
			res.write(JSON.stringify(false).toString("utf-8"));
			res.end();
			return false;
		}

	});

// EVENTS
	var date = new Date();
	//var diff = date.getTimezoneOffset()/60;
	var diff = 0;

	var d = date.getDate();
	var m = date.getMonth();
	var y = date.getFullYear();
	function addBackgroundColor(events) { //changes the events object
		var color = {
			'green': '#097054',
			'red': '#9E3B33',
			'yellow': '#E48743',
			'gray': '#666666'
		};
		for (index = 0; index < events.length; ++index) {
			event = events[index];
			if(event.duration == false) {
				events[index]['className'] = ['striped']; //handles the setup and breakdown events as well
			}
			if (event.valid == false) {
				events[index]['backgroundColor'] = color.gray;
			} else if (event.shifts.length == 0) {
				events[index]['backgroundColor'] = color.red;
			} else if (event.shifts.length < event.staffNeeded) {
				events[index]['backgroundColor'] = color.yellow;
			} else if (event.shifts.length == event.staffNeeded) {
				events[index]['backgroundColor'] = color.green;
			}
		}
		return events;
	}

	//Event fetching should be filtered according to the time variables, still not done after MongoDB
	app.get("/events", cas.blocker, function(req, res) {
		//86400s = 1d
		var start = new Date(req.query.start * 1000);
		var end = new Date(req.query.end * 1000);
		var query = {};
		if(req.query.filter == 'hideCancelled') {
			query = {valid: true};
		} else if(req.query.filter == 'unstaffed') {
			query = { $where: "this.shifts.length < this.staffNeeded", valid: true };
		} else if(req.query.filter == 'onlyMine') {
			query = {shifts: { $elemMatch: { staff: getUser(req) } }};
		} else if(req.query.filter == 'recentVideo') {
			query = {video: true};
		}
		$.extend(query, {'start': {$gte: start, $lt: end}});
		db.events.find(query, function(err, events) {
			if (err || !events) {
				console.log("No events found");
			} else {
				events = addBackgroundColor(events);
				res.write(JSON.stringify(events).toString("utf-8"));
				res.end();
			}
		});

		//req.url
		console.log("Req for events starting at " + start.toDateString() + " and ending before " + end.toDateString());
		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
		
	});

		app.post("/event/duration", cas.blocker, function(req, res) {
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			if(permission(req) != 10) {
				res.write(JSON.stringify(false).toString("utf-8"));
				res.end();
				return false;
			}
			//req.url
			console.log("Req for duration toggle Event ID " + req.body.eventid);
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $set: {'duration': JSON.parse(req.body.make) } }, 
				function(err, updated) {
					if (err || !updated) {
						console.log("Event not duration toggled:" + err);
					} else {
						console.log("Event duration toggled");
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
			console.log("Req for duration toggle Event ID " + req.body.eventid);
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $set: {'video': JSON.parse(req.body.make) } }, 
				function(err, updated) {
					if (err || !updated) {
						console.log("Event not video toggled:" + err);
					} else {
						console.log("Event video toggled");
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
			console.log("Req for event edit Event ID " + req.body.eventid);
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
						console.log("Event not edited:" + err);
					} else {
						console.log("Event edited");
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
			console.log("Req for staffNeeded spinner for Event ID " + req.body.eventid);
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $set: {'staffNeeded': parseInt(req.body.make) } }, 
				function(err, updated) {
					if (err || !updated) {
						console.log("Event staffNeeded not changed:" + err);
					} else {
						console.log("Event staffNeeded changed");
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
			console.log("Req for cancel toggle Event ID " + req.body.eventid);
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $set: {'valid': JSON.parse(req.body.make) } }, 
				function(err, updated) {
					if (err || !updated) {
						console.log("Event not cancel toggled:" + err);
					} else {
						console.log("Event cancel toggled");
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
			console.log("Req for remove Event ID " + req.body.eventid);
			db.events.remove(
				{_id: new mongo.ObjectID(req.body.eventid)},
				function(err, removed) {
					if (err || !removed) {
						console.log("Event not removed:" + err);
					} else {
						console.log("Event removed");
						res.write(JSON.stringify(true).toString("utf-8"));
						res.end();
					}
				});
		});
  app.locals.formatAMPM = function(date) {
	  var hours = date.getHours();
	  var minutes = date.getMinutes();
	  var ampm = hours >= 12 ? 'PM' : 'AM';
	  hours = hours % 12;
	  hours = hours ? hours : 12; // the hour '0' should be '12'
	  minutes = minutes < 10 ? '0'+minutes : minutes;
	  var strTime = hours + ':' + minutes + ' ' + ampm;
	  return strTime;
	} //end formatAMPM
	app.locals.getFormattedDate = function(date) {
	  var year = date.getFullYear();
	  var month = (1 + date.getMonth()).toString();
	  month = month.length > 1 ? month : '0' + month;
	  var day = date.getDate().toString();
	  day = day.length > 1 ? day : '0' + day;
	  return month + '/' + day + '/' + year;
	};

	app.get('/printtoday', cas.blocker, function(req, res) {
		console.log('Req for seeing today\'s events list');
		var today = new Date();
			today.setHours(0);
			today.setMinutes(0);
			today.setSeconds(0);
			today.setMilliseconds(0);
			var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
			db.events.find({start: {$gte: today, $lt: tomorrow}, valid:true}).sort({start: 1},
				function(err, data) {
						res.render('printtoday', {
							events: data
						});
				});
	});

// TRIVIAL STUFF

	// INVENTORY
		// All inventory
		app.get("/inventory/all", cas.blocker, function(req, res) {
			//req.url
			console.log("Req for all inventory");
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			res.write(JSON.stringify(allInventory).toString("utf-8"));
			res.end();
		});

		//Existing inventory for each event
		app.get("/inventory/existing/:id", cas.blocker, function(req, res) {
			//req.url
			console.log("Req for inventory of Event ID " + req.params.id);
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			//Event filtering and inventory
			/*var selectedEvent = events.filter(function(event) {
				return event.id == req.params.id;
			})[0];*/
			db.events.find({_id: new mongo.ObjectID(req.params.id)}, function(err, data) {
				if (err || !data) {
					console.log("No events found");
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
				console.log("Req for adding inventory ID " + req.body.inventoryid + " to Event ID " + req.body.eventid);
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
							console.log("Inventory not added:" + err);
						} else {
							console.log("Inventory added");
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
				console.log("Req for removing inventory ID " + req.body.inventoryid + " from Event ID " + req.body.eventid);
				db.events.update(
					{_id: new mongo.ObjectID(req.body.eventid)},
					{ $pull: {'inventory': req.body.inventoryid } }, 
					function(err, updated) {
						if (err || !updated) {
							console.log("Inventory not removed:" + err);
						} else {
							console.log("Inventory removed");
							res.write(JSON.stringify(true).toString("utf-8"));
							res.end();
						}
					});
			});

	// NOTES
		//Existing notes for each event
		app.get("/notes/existing/:id", cas.blocker, function(req, res) {
			//req.url
			console.log("Req for fetching notes of Event ID " + req.params.id);
			//Event filtering and inventory
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			db.events.find({_id: new mongo.ObjectID(req.params.id)}, function(err, events) {
				if (err || !events) {
					console.log("No events found");
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
				console.log("Req for adding note \"" + req.body.note + "\" to Event ID " + req.body.eventid);
				var generatedID = new mongo.ObjectID();
				db.events.update(
					{_id: new mongo.ObjectID(req.body.eventid)},
					{ $addToSet: {'notes': {'id': generatedID, 'text': req.body.note,'user': getUser(req), 'date': new Date()}} }, 
					function(err, updated) {
						if (err || !updated) {
							console.log("Note not added:" + err);
						} else {
							console.log("Note added");
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
				console.log("Req for removing note ID " + req.body.id + " from Event ID " + req.body.eventid);
				var deleteNote = function() {
					db.events.update(
						{_id: new mongo.ObjectID(req.body.eventid)},
						{ $pull: {'notes': {'id': new mongo.ObjectID(req.body.id)} } }, 
						function(err, updated) {
							if (err || !updated) {
								console.log("Note not removed:" + err);
							} else {
								console.log("Note removed");
								res.write(JSON.stringify(true).toString("utf-8"));
								res.end();
							}
						});
				};
				if(permission(req) == 10) { //remove the note if it's a manager
					deleteNote();
				} else {
					db.events.find({_id: new mongo.ObjectID(req.body.eventid)}, function(err, events) {
						if (err || !events || events.length < 1 ) {
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
			console.log("Req for all staff info");
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
			console.log("Req for staff info of Event ID " + req.params.id);
			// Filter the events/database and return the staff and shifts info (requires to decide on db structure)
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			db.events.find({_id: new mongo.ObjectID(req.params.id)}, function(err, events) {
				if (err || !events) {
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
				if(permission(req) != 10) {
					res.write(JSON.stringify(false).toString("utf-8"));
					res.end();
					return false;
				}
				console.log("Req for adding shift \"" + req.body.staff + "\" to Event ID " + req.body.eventid);
				var eventStart = new Date(Date.parse(req.body.eventStart));
				var eventEnd = new Date(Date.parse(req.body.eventEnd));
				var generatedID = new mongo.ObjectID();
				var startDate = new Date(Date.parse(eventStart.getFullYear() + "-" + (eventStart.getMonth()+1) + "-" + eventStart.getDate() + " " +req.body.start));
				var endDate = new Date(Date.parse(eventEnd.getFullYear() + "-" + (eventStart.getMonth()+1) + "-" + eventEnd.getDate() + " " +req.body.end));
				db.events.update(
					{_id: new mongo.ObjectID(req.body.eventid)},
					{ $addToSet: {'shifts': {'id': generatedID, 'start': startDate,'end': endDate, 'staff': req.body.staff}} }, 
					function(err, updated) {
						if (err || !updated) {
							console.log("Shift not added:" + err);
						} else {
							console.log("Shift added");
							res.write(JSON.stringify({'id':generatedID.toString(),'start':startDate, 'end':endDate}).toString("utf-8"));
							res.end();
						}
					});
			});
		//Remove staff/shift from an event (POST)
			app.post("/staff/remove", cas.blocker, function(req, res) {
				res.writeHead(200, {
					'Content-Type': 'application/json'
				});
				if(permission(req) != 10) {
					res.write(JSON.stringify(false).toString("utf-8"));
					res.end();
					return false;
				}
				console.log("Req for removing shift ID " + req.body.id + " from Event ID " + req.body.eventid);
				db.events.update(
					{_id: new mongo.ObjectID(req.body.eventid)},
					{ $pull: {'shifts': {'id': new mongo.ObjectID(req.body.id)} } }, 
					function(err, updated) {
						if (err || !updated) {
							console.log("Shift not removed:" + err);
						} else {
							console.log("Shift removed");
							res.write(JSON.stringify(true).toString("utf-8"));
							res.end();
						}
					});
			});

			//this is determined by staff time checking, not shift time checking, therefore if 
			app.get("/staff/available/today", cas.blocker, function(req, res) {
				var busyStaff = [];
				//86400s = 1d
				var start = new Date(req.query.start * 1000);
				var end = new Date(req.query.end * 1000);
				console.log("Req for staff available starting at " + start.toDateString() + " and ending before " + end.toDateString());
				res.writeHead(200, {
					'Content-Type': 'application/json'
				});
				var query = {};
				$.extend(query, {'start': {$gte: start, $lt: end}});
				db.events.find(query, function(err, events) {
					if (err || !events) {
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
				var start = new Date(Date.parse(req.query.start));
				var end = new Date(Date.parse(req.query.end));
				end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
				console.log(start);
				console.log("Req for staff check for " + req.query.user);
				db.events.find({'start': {$gte: start, $lt: end}, 'shifts':{$elemMatch: {'staff': req.query.user}},}, function(err, events) {
					if (err || !events) {
						console.log("No events found");
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
				var start = new Date(Date.parse(req.query.start));
				var end = new Date(Date.parse(req.query.end));
				end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
				console.log(start);
				console.log("Req for staff table for " + req.query.user);
				db.events.find({'start': {$gte: start, $lt: end},}, function(err, events) {
					if (err || !events) {
						console.log("No events found");
						res.write(JSON.stringify(false).toString("utf-8"));
						res.end();
					} else {
						var result = {};
						events.forEach(function(event) {
							event.shifts.forEach(function(shift) {
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
				console.log("Req for staff check");
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
				console.log("Req for staff check");
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
		  res.render('upload');
		});


		app.post('/fileUpload', cas.blocker, function(req, res) {
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
					var xml = fs.readFileSync(req.files.myFile.path);
					var last = fs.readFileSync(Preferences.path_last_xml);
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

				var whatToChange = { update: [], add: [] };
				// Parsed XML files are compared according to their unique ID's, event by event
				xml.forEach(function(xmlEntry) {
					//try to find an object with the same unique ID
					var entryInLast = _.findWhere(last, {'Service_x0020_Order_x0020_Detail_x0020_ID': xmlEntry['Service_x0020_Order_x0020_Detail_x0020_ID']});
					if(typeof entryInLast != 'undefined') { //if exists, then compare if they are the same
						if(!_.isEqual(xmlEntry, entryInLast)) {
							whatToChange.update.push(xmlEntry); //if they are the same, store to update later
						}
					} else { //if it doesn't exist in the last.xml, then store it to add later.
						whatToChange.add.push(xmlEntry);
					}
				});
				//should write a part that distinguishes new events and updated events.
				var process = function(data) {
					var bookingDate = data['Booking_x0020_Date'].split(" ")[0]
					var reservedStart = new Date(Date.parse(bookingDate + ' ' + data['Reserved_x0020_Start']));
					var reservedEnd = new Date(Date.parse(bookingDate + ' ' + data['Reserved_x0020_End']));
					var eventStart = new Date(Date.parse(bookingDate + ' ' + data['Event_x0020_Start']));
					var eventEnd = new Date(Date.parse(bookingDate + ' ' + data['Event_x0020_End']));
					if (data['Booking_x0020_Status'] == 'Cancelled') {
						var valid = false;
					} else {
						var valid = true;
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
						desc:  data['Notes'],
						loc:   data['Room_x0020_Description'],
						//staffNeeded: 1,
						start: reservedStart,
						end:   reservedEnd,
						'eventStart': eventStart,
						'eventEnd':   eventEnd,
						'valid':  valid,
						duration: true,
						'video':  video,
						//inventory: [], //we don't want to reset these for the events that are only updated
						//notes:     [],
						//shifts:    [],
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

				var changeNumbers = {add:0, update:0};
				var parallel = [];
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
											db.events.update(
												{XMLid: event.XMLid}, 
												{$set: event },
												function(err, updated) {
													if (err || !updated) {
														console.log("Event could not be updated: " + err);
														console.log(event.title);
													} else {
														changeNumbers.update++;
														callback();
													}
												});
										});
				});

				async.parallel(parallel, function() {
					console.log("Upload and saving progress ended successfully");
					res.writeHead(200);
					res.write(changeNumbers.add + ' events added and ' + changeNumbers.update + ' events updated, upload and saving progress ended successfully.');
					res.end();

					// delete the old last.xml file and rename the new uploaded file as last.xml
					(function(path) {
						fs.unlink(Preferences.path_last_xml, function(err) {
							if (err) {
								console.log(err);
								return false;
							}
							console.log('Old last.xml file successfully deleted');
							fs.rename(path, Preferences.path_last_xml, function(err) {
								if (err) throw err;
								console.log('Uploaded file renamed to last.xml');
							});
						});
					})(req.files.myFile.path);
				});
			} catch (err) {
				// delete the newly uploaded file because there is no need to store it
				(function(path) {
					fs.unlink(path, function(err) {
						if (err) {
							console.log(err);
							return false;
						}
						console.log('File with error successfully deleted');
					});
				})(req.files.myFile.path);
				res.writeHead(400);
				res.end();
				console.log(err);
				return false;
			}
		});

// MAIN PAGE RENDERING

	app.get('/', cas.blocker, function (req, res) {
		if(req.query.ticket) {res.redirect('/');} //redirect to the base if there is a ticket in the URL
		  res.render('index',
			{
				username: getUser(req),
				permission: permission(req),
			});
		});

// MOBILE
	app.get('/m', cas.blocker, function (req, res) {
		if(req.query.ticket) {res.redirect('/m/');} //redirect to the base if there is a ticket in the URL
		res.redirect('/m/0/');
	});
	app.locals.fixParantheses = function(s) {
		return s.replace("&#35;","#").replace("&#41;",")").replace("&amp;#40;","(");
	}
	app.get('/m/:counter/', cas.blocker, function (req, res) {
		var today = new Date();
		today.setHours(0);
		today.setMinutes(0);
		today.setSeconds(0);
		today.setMilliseconds(0);
		var start = new Date(today.getTime() + 24 * 60 * 60 * 1000 * req.params.counter);
		var end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
		
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
				console.log("No events found");
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
				console.log("No events found");
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

// STARTING THE SERVER
	/* //options for using SSL, not used right now
	var options = {
	        key: fs.readFileSync('../ssl-key.pem'),
	        cert: fs.readFileSync('/etc/pki/tls/certs/ca-bundle.crt'),
	        };
	*/
	app.listen(Preferences.port, function() {
		console.log("Express server listening on port " + Preferences.port);
		if(Preferences.debug == false) {console.log = function(){};} //cancel console logs if debug
	});