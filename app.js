//New NED
var express = require('express');

var app = express();
var path = require('path');
var sugar = require('sugar');

var databaseUrl = "spec"; // "username:password@example.com/mydb"
var collections = ["events"]
var db = require("mongojs").connect(databaseUrl, collections);
var mongo = require('mongodb-wrapper');

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
		} else if (event.staffAdded == 0) {
			events[index]['backgroundColor'] = color.red;
		} else if (event.staffAdded < event.staffNeeded) {
			events[index]['backgroundColor'] = color.yellow;
		} else if (event.staffAdded == event.staffNeeded) {
			events[index]['backgroundColor'] = color.green;
		}
	}
	return events;
}

app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

//EVENTS
//Event fetching should be filtered according to the time variables, still not done after MongoDB
app.get("/events", function(req, res) {
	//86400s = 1d
	var start = new Date(req.query.start * 1000);
	var end = new Date(req.query.end * 1000);

	db.events.find({}, function(err, events) {
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

app.get('/printtoday', function(req, res) {
	res.render('printtoday');
});


var allInventory = [{
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
	},
	{
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
		//req.url
		console.log("Req for inventory of Event ID " + req.params.id);
		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
		//Event filtering and inventory
		/*var selectedEvent = events.filter(function(event) {
			return event.id == req.params.id;
		})[0];*/
		db.events.find({_id: new mongo.ObjectID(req.params.id)}, function(err, events) {
			if (err || !events) {
				console.log("No events found");
			} else {
				res.write(JSON.stringify(events[0].inventory).toString("utf-8"));
				res.end();
			}
		});
		/*res.write(JSON.stringify(selectedEvent.inventory).toString("utf-8"));
		res.end();*/
	});

	//Inventory Update
		//Add inventory to an event (POST)
		app.post("/inventory/add", function(req, res) {
			//req.url
			console.log("Req for adding inventory ID " + req.body.inventoryid + " to Event ID " + req.body.eventid);
			//frontend checks for the same inventory adding, so no control needed for that
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			 //try to find the thing by its id and use the same data
			var selectedInventory = allInventory.filter(function(thing) {
				return thing.id == req.body.inventoryid;
			})[0];
			
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $addToSet: {'inventory': {'id': req.body.inventoryid, 'text': selectedInventory.text,'title': selectedInventory.title}} }, 
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
			console.log("Req for removing inventory ID " + req.body.inventoryid + " from Event ID " + req.body.eventid);
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $pull: {'inventory': {'id': req.body.inventoryid} } }, 
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
		//Add inventory to an event (POST) - not tested
		app.post("/notes/add", function(req, res) {
			//req.url
			console.log("Req for adding note \"" + req.body.note + "\" to Event ID " + req.body.eventid);
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			var generatedID;
			var fetchUser;
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $addToSet: {'notes': {'id': req.body.generatedID, 'text': req.body.note,'user': fetchUser, 'date': new Date()}} }, 
				function(err, updated) {
					if (err || !updated) {
						console.log("Note not added:" + err);
					} else {
						console.log("Note added");
						res.write(JSON.stringify(true).toString("utf-8"));
						res.end();
					}
				});
		});

		//Remove inventory from an event (POST)
		app.post("/notes/remove", function(req, res) {
			//req.url
			console.log("Req for removing note ID " + req.body.id + " from Event ID " + req.body.eventid);
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			db.events.update(
				{_id: new mongo.ObjectID(req.body.eventid)},
				{ $pull: {'notes': {'id': req.body.id} } }, 
				function(err, updated) {
					if (err || !updated) {
						console.log("Note not removed:" + err);
					} else {
						console.log("Note removed");
						res.write(JSON.stringify(true).toString("utf-8"));
						res.end();
					}
				});
		});

// STAFF
var existingStaff = {
			'mtrifunovski': 'Maksim Trifunovski (mtrifunovski)',
			'tskim': 'Ted Kim (tskim)',
			'hflores': 'Heric Flores (hflores)',
			'ckorkut': 'Cumhur Korkut (ckorkut)',
			'jdoe': 'John Doe (jdoe)',
		};
	//All event staff in IMS
	app.get("/staff/all", function(req, res) {
		//req.url
		console.log("Req for all staff info");
		// Filter the events/database and return the staff and shifts info (requires to decide on db structure)
		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
		res.write(JSON.stringify(existingStaff).toString("utf-8"));
		res.end();
	});
	//Get the existing staff of an event
	app.get("/staff/get/:id", function(req, res) {
		//req.url
		console.log("Req for staff info of Event ID " + req.params.id);
		// Filter the events/database and return the staff and shifts info (requires to decide on db structure)
		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
		res.write(JSON.stringify(existingStaff).toString("utf-8"));
		res.end();
	});
	//Add staff/shift to an event (POST)

	//Remove staff/shift from an event (POST)


//Main Page Rendering
	/*app.get('/', function (req, res) {
	  res.render('index',
	  { title : 'Home' }
	  )
	});*/


app.listen(8080);
console.log('Listening on port 8080');