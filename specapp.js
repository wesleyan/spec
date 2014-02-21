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
		mongo 	= require('mongodb-wrapper');
		fs 		= require('fs');
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

	app.get('/login', cas.bouncer, function(req, res) {
		res.redirect('/');
	});

	app.get('/logout', cas.logout);

	app.get("/user", cas.blocker, function(req, res) {
		//req.session.cas_user
		res.json({'username':User.getUser(req), 'permission':User.permission(req)});
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
	app.get('/fileUpload', cas.blocker, function(req, res) {
		User.permissionControl(req, res, 10);

		var lastInfo = ['',''];
		try {
			var readFile = fs.readFileSync(__dirname + Preferences.path_last_upload_info); //see the last upload time & user
			lastInfo = readFile.toString().split('&');
		} catch(e) {}
	 	res.render('upload', {lastUploadTime: lastInfo[0], lastUploadUser: lastInfo[1]});
	});

	app.post('/fileUpload', cas.blocker, function(req, res) {
		User.permissionControl(req, res, 10);

		var today = new Date(); today.setHours(0,0,0,0),
			twoWeeksLater = new Date((new Date).getTime() + 2 * 7 * 24 * 60 * 60 * 1000); twoWeeksLater.setHours(23,59,59,999);
		db.events.find({'start': {$gte: today, $lt: twoWeeksLater}}, function(err, events) {
			if (err || !events) {
				console.log(req.url);
				console.log("No events found" + err);
			} else {
				// events loaded. let's check for every event

					var parser = require('xml2json');
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
							fs.writeFileSync(__dirname + Preferences.path_last_upload_info, (new Date() + '&' + User.getUser(req))); //store the last upload time & user
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
		var smtpTransport = Utility.smtpTransport();
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
			
			//var managerList = _.where(cache.get('storeStaff'), {level:10});
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
		var currentUser = _.findWhere(cache.get('storeStaff'), { 'username': User.getUser(req) });
		if(_.isUndefined(currentUser)) { //the user is not in the staff database
			res.render('notStaff', {cas_user: User.getUser(req)});
		} else {
			res.render('index', {
				username: currentUser.username,
				permission: currentUser.level,
				staffname: currentUser.name,
			});
		}
	});

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