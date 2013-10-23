//New NED
var express = require('express');

var app = express();
var $ = require('jquery');

var databaseUrl = "127.0.0.1:27017/spec"; // "username:password@example.com/mydb"
var collections = ['events','staff']
var db = require("mongojs").connect(databaseUrl, collections);
var mongo = require('mongodb-wrapper');


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

app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.bodyParser({keepExtensions: true, uploadDir:'uploads'}));
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});
var ejs = require('ejs');
ejs.open = '{{';
ejs.close = '}}';
//We can store all staff in memory, since it is not a big array and it will be used VERY frequently, will save time.

//CAS Session Management will come here.
	var cas = require('grand_master_cas');
	cas.configure({
	  casHost: 'sso.wesleyan.edu',
	  ssl: true,
	  service: 'http://ims-dev.wesleyan.edu:8080',
	  redirectUrl: '/login'
	});
app.get('/logout', cas.logout);

app.get('/login', cas.bouncer, function(req, res) {
  res.redirect('/');
});

	function getUser(req) {
		//return 'ckorkut'; //let's assume that the session variable is this for now
		return req.session.cas_user;
	}

	function inSession(req) { //boolean returning function to detect if logged in or user in staff list
		return true;
		//this is the actual code for the future:
		/*var userObj = $.grep(app.locals.storeStaff, function(e){ return e.username == getUser(req); });
		if(userObj.length < 1) {
			return false;
		} else {
			return true;
		}*/
	}

	function permission(req) { //returns the permission level of the user in session
		var userObj = $.grep(app.locals.storeStaff, function(e){ return e.username == getUser(req); });
		if(userObj.length < 1) {
			return false;
		} else {
			return userObj[0].level;
		}
	}
	//CAS Session Management ends here.


app.get("/user", function(req, res) {
	if(!inSession(req)) {res.end();	return false;} //must be logged in
	//req.url
	console.log("Req for session user");
	res.writeHead(200, {
		'Content-Type': 'application/json'
	});
	//req.session.cas_user
	res.write(JSON.stringify({'username':getUser(req), 'permission':permission(req)}).toString("utf-8"));
	res.end();
});

//EVENTS
	//Event fetching should be filtered according to the time variables, still not done after MongoDB
	app.get("/events", function(req, res) {
		if(!inSession(req)) {res.end();	return false;} //must be logged in

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

		app.post("/event/duration", function(req, res) {
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
		app.post("/event/video", function(req, res) {
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
		app.post("/event/edit", function(req, res) {
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
		app.post("/event/spinner", function(req, res) {
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
		app.post("/event/cancel", function(req, res) {
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
		app.post("/event/remove", function(req, res) {
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

app.get('/printtoday', function(req, res) {
	if(!inSession(req)) {res.end();	return false;} //must be logged in
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

// INVENTORY
	// All inventory
	app.get("/inventory/all", function(req, res) {

		if(!inSession(req)) {res.end();	return false;} //must be logged in
		//req.url
		console.log("Req for all inventory");
		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
		res.write(JSON.stringify(allInventory).toString("utf-8"));
		res.end();
	});

	//Existing inventory for each event
	app.get("/inventory/existing/:id", function(req, res) {
		if(!inSession(req)) {res.end();	return false;} //must be logged in
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
		app.post("/inventory/add", function(req, res) {
			//req.url
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
		app.post("/inventory/remove", function(req, res) {
			//req.url
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
	app.get("/notes/existing/:id", function(req, res) {
		if(!inSession(req)) {res.end();	return false;} //must be logged in
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
		app.post("/notes/add", function(req, res) {
			//req.url
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			if(!inSession(req)) {
				res.write(JSON.stringify(false).toString("utf-8"));
				res.end();
				return false;
			}
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
		app.post("/notes/remove", function(req, res) {
			//req.url
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			console.log("Req for removing note ID " + req.body.id + " from Event ID " + req.body.eventid);
			var deleteNote = function() {
				db.events.update(
					{_id: new mongo.ObjectID(req.body.eventid)},
					{ $pull: {'notes': {'id': new mongo.ObjectID(req.body.id)/*, 'user':getUser(req)*/} } }, 
					function(err, updated) {
						if (err || !updated) {
							console.log("Note not removed:" + err);
						} else {
							console.log("Note removed");
							res.write(JSON.stringify(true).toString("utf-8"));
							res.end();
						}
					});
			}
			if(permission(req) == 10) { //remove the note if it's a manager
				deleteNote();
			} else {
				db.events.find({_id: new mongo.ObjectID(req.params.eventid)}, function(err, note) {
					if (err || !note) {
						console.log("No such note found");
					} else {
						var theNote = $.grep(events[0].notes, function(e){ return e['_id'] == req.params.id; });
						if(theNote.user == getUser(req)) { //req.session.cas_user
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
	app.get("/staff/all", function(req, res) {
		if(!inSession(req)) {res.end();	return false;} //must be logged in
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
	app.get("/staff/get/:id", function(req, res) {
		if(!inSession(req)) {res.end();	return false;} //must be logged in
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
		app.post("/staff/add", function(req, res) {
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
		app.post("/staff/remove", function(req, res) {
			//req.url
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
		app.get("/staff/available/today", function(req, res) {
			if(!inSession(req)) {res.end();	return false;} //must be logged in
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

		app.get("/staff/check", function(req, res) {
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
	app.get('/staffCheck', function (req, res) {
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

//Main Page Rendering

app.get('/', cas.blocker, function (req, res) {
	if(!inSession(req)) {res.end();	return false;} //must be logged in
	  res.render('index',
		{
			username: getUser(req),
			permission: permission(req),
		});
	});

app.get('/m/', function (req, res) {
	res.redirect('/m/0/');
});
app.locals.fixParantheses = function(s) {
	return s.replace("&#35;","#").replace("&#41;",")").replace("&amp;#40;","(");
}
app.get('/m/:counter/', function (req, res) {
	if(!inSession(req)) {res.end();	return false;} //must be logged in

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
app.get('/m/event/:id', function (req, res) {
	if(!inSession(req)) {res.end();	return false;} //must be logged in
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


//File Upload
	app.get('/fileUpload', function(req, res) {
		if(permission(req) != 10) {
			res.write(JSON.stringify(false).toString("utf-8"));
			res.end();
			return false;
		}
	  res.render('upload');
	});

	var fs = require('fs');
	var parser = require('xml2json');

	app.post('/fileUpload', function(req, res) {
		if(permission(req) != 10) {
			res.write(JSON.stringify(false).toString("utf-8"));
			res.end();
			return false;
		}
		console.log('Upload and saving progress started');
		//you should check if it's an xml file
		try {
			var xml = fs.readFileSync(req.files.myFile.path);
			var parsed = parser.toJson(xml,{
				object: true,
				trim: true,
				arrayNotation: true
			});
			parsed = parsed['CopyofIMSforExport']['Data'];

			var processed = [];

			parsed.forEach(function(data) {
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
				processed.push({
					title: data['Event_x0020_Name'],
					desc: data['Notes'],
					loc: data['Room_x0020_Description'],
					staffNeeded: 1,
					start: reservedStart,
					end: reservedEnd,
					'eventStart': eventStart,
					'eventEnd': eventEnd,
					'valid': valid,
					duration: true,
					'video': video,
					inventory: [],
					notes: [],
					shifts:[]
				});
			});

			processed.forEach(function(event) {
				db.events.save(event, function(err, saved) {
					if (err || !saved) console.log("Event not saved");
					else console.log("Event saved");
				});
			});

			console.log("Upload and saving progress ended successfully");
			res.writeHead(200);
		} catch(err) {
			res.writeHead(400);
			console.log(err);
		}
	  	deleteAfterUpload(req.files.myFile.path);
	  	res.end();
	});

	// Private functions

	var deleteAfterUpload = function(path) {
	  setTimeout( function(){
	    fs.unlink(path, function(err) {
	      if (err) console.log(err);
	      console.log('file successfully deleted');
	    });
	  }, 60 * 1000 * 4); //stays there for 4 minutes
	};

app.listen(8080);
console.log('Listening on port 8080');