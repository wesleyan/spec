//New NED
var express = require('express');

var app = express();
var path = require('path');
var sugar = require('sugar');

var date = new Date();
//var diff = date.getTimezoneOffset()/60;
var diff = 0;

var d = date.getDate();
var m = date.getMonth();
var y = date.getFullYear();

var color = {
	'green': '#097054',
	'red': '#9E3B33',
	'yellow': '#E48743',
	'gray': '#666666'
}

var events = [{
	id: 1,
	title: 'Luncheon: Division III NSM Luncheon',
	desc: 'Please arrive at 11:30 am to help set up the existing projector and screen. Client will bring their own PC laptop.',
	loc: 'ESC 184 (Woodhead Lounge)',
	staffAdded: 1,
	staffNeeded: 1,
	start: new Date(y, m, d, 9 - diff, 45),
	end: new Date(y, m, d, 13 - diff, 30),
	valid: true,
	duration: true,
	people: ['ckorkut'],
	inventory: [{
		"id": "4",
		"text": "Video Camera",
		"title": "This item needs to be recorded."
	},],
	notes: [{
		id: 1,
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: 2,
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'tskim',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
}, {
	id: 2,
	title: 'Reception: Prof. F. Reeve Memorial & Reception',
	desc: 'Client would like technician to arrive at 1pm to set up laptop to play CDs during the reception. Client would like to have the technician on hand for two hours. Please bring handheld wireless microphone.',
	loc: 'Russell House All Rooms ',
	staffAdded: 1,
	staffNeeded: 1,
	start: new Date(y, m, d, 13 - diff, 0),
	end: new Date(y, m, d, 18 - diff, 0),
	valid: true,
	duration: false,
	className: ['striped'],
	people: ['tskim'],
	inventory: [{
		"id": "2",
		"text": "Macbook Pro 13",
		"title": "This item needs to be recorded."
	},],
	notes: [{
		id: 1,
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'dsongcho',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: 2,
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
}, {
	id: 3,
	title: 'Dance Presentation',
	desc: 'A technician is needed to stay for the duration of the presentation to assist with hooking up a laptop to the ceiling projector to play youtube clips and other things. NOTE: This is for a class so there should be no charge.',
	loc: 'Schonberg Dance Studio',
	staffAdded: 2,
	staffNeeded: 2,
	start: new Date(y, m, d, 13 - diff, 15),
	end: new Date(y, m, d, 14 - diff, 30),
	valid: true,
	video: true,
	duration: true,
	people: ['jgoh', 'ckorkut'],
	inventory: [{
		"id": "4",
		"text": "Video Camera",
		"title": "This item needs to be recorded."
	},{
		"id": "6",
		"text": "Camera",
		"title": "This item needs to be recorded."
	}],
	notes: [{
		id: 1,
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'dsongcho',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: 2,
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
}, {
	id: 4,
	title: 'Meeting',
	desc: 'Please have Heric Flores present on site for the duration of the meeting to serve as AV technician.',
	loc: 'Shanklin 107 (Kerr Lecture Hall)',
	staffAdded: 1,
	staffNeeded: 1,
	start: new Date(y, m, d + 1, 10 - diff, 30),
	valid: false,
	duration: true,
	people: ['hflores'],
	inventory: [{
		"id": "4",
		"text": "Video Camera",
		"title": "This item needs to be recorded."
	},],
	notes: [{
		id: 1,
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'dsongcho',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: 2,
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
}, {
	id: 5,
	title: 'Lunch',
	desc: 'Please have Heric Flores present on site at 8am and remain for the duration of the meeting to serve as AV technician. Presenter will arive at 8:30am and will bring laptop. Please connect presenter`s laptop to projection and project onto the screen on the west wall. Provide lavaliere mic for presenter.',
	loc: 'Usdan 300 (Daniel Family Commons & Lounge)',
	staffAdded: 1,
	staffNeeded: 2,
	start: new Date(y, m, d, 12, 0),
	end: new Date(y, m, d, 14, 0),
	valid: true,
	duration: false,
	className: ['striped'],
	people: ['hflores'],
	inventory: [{
		"id": "1",
		"text": "Projector",
		"title": "This item needs to be recorded."
	},],
	notes: [{
		id: 1,
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'dsongcho',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: 2,
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
}, {
	id: 6,
	title: 'Birthday Party',
	desc: 'Please arrive at 19:00 pm (promptly) to set up the existing computer, projector, and screen. Please plan to stay for the entire event to troubleshoot if necessary.',
	loc: 'Beckham Hall',
	staffAdded: 0,
	staffNeeded: 1,
	start: new Date(y, m, d + 1, 19 - diff, 0),
	end: new Date(y, m, d + 2, 2 - diff, 30),
	valid: true,
	duration: true,
	people: [],
	inventory: [{
		"id": "4",
		"text": "Video Camera",
		"title": "This item needs to be recorded."
	},],
	notes: [{
		id: 1,
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'dsongcho',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: 2,
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
	//url: 'http://google.com/'
}];



function addBackgroundColor(events) { //changes the events object
	for (index = 0; index < events.length; ++index) {
		event = events[index];
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
events = addBackgroundColor(events);

app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

//EVENTS
//Event fetching should be filtered according to the time variables
app.get("/events", function(req, res) {
	//86400s = 1d
	var start = new Date(req.query.start * 1000);
	var end = new Date(req.query.end * 1000);
	//req.url
	console.log("Req for events starting at " + start.toDateString() + " and ending before " + end.toDateString());
	res.writeHead(200, {
		'Content-Type': 'application/json'
	});
	res.write(JSON.stringify(events).toString("utf-8"));
	res.end();
});

app.get('/printtoday', function(req, res) {
	res.render('printtoday')
});


var allInventory = [{
		"id": "4",
		"text": "Video Camera",
		"title": "This item needs to be recorded."
	}, {
		"id": "6",
		"text": "Camera",
		"title": "This item needs to be recorded."
	}, {
		"id": "7",
		"text": "Tripod",
		"title": "This item needs to be recorded."
	}, {
		"id": "5",
		"text": "HDMI Cable",
		"title": "This item needs to be recorded."
	}, {
		"id": "1",
		"text": "Projector",
		"title": "This item needs to be recorded."
	},
	{
		"id": "2",
		"text": "Macbook Pro 13",
		"title": "This item needs to be recorded."
	}, {
		"id": "3",
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
		var selectedEvent = events.filter(function(event) {
			return event.id == req.params.id;
		})[0];
		res.write(JSON.stringify(selectedEvent.inventory).toString("utf-8"));
		res.end();
	});

	//Inventory Update
		//Add inventory to an event (POST)
		app.post("/inventory/add", function(req, res) {
			//req.url
			console.log("Req for adding inventory ID " + req.body.inventoryid + " to Event ID " + req.body.eventid);
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});

			res.write(JSON.stringify(true).toString("utf-8"));
			res.end();
		});

		//Remove inventory from an event (POST)
		app.post("/inventory/remove", function(req, res) {
			//req.url
			console.log("Req for removing inventory ID " + req.body.inventoryid + " from Event ID " + req.body.eventid);
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			res.write(JSON.stringify(true).toString("utf-8"));
			res.end();
		});

// NOTES
	//Existing notes for each event
	app.get("/notes/existing/:id", function(req, res) {
		//req.url
		console.log("Req for fetching notes of Event ID " + req.params.id);
		//Event filtering and inventory
		var selectedEvent = events.filter(function(event) {
			return event.id == req.params.id;
		})[0];
		res.writeHead(200, {
			'Content-Type': 'application/json'
		});
		res.write(JSON.stringify(selectedEvent.notes).toString("utf-8"));
		res.end();
	});

	//Notes Update
		//Add inventory to an event (POST)
		app.post("/notes/add", function(req, res) {
			//req.url
			console.log("Req for adding note \"" + req.body.note + "\" to Event ID " + req.body.eventid);
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			var noteId = 5;
			res.write(JSON.stringify({'id':noteId}).toString("utf-8"));
			res.end();
		});

		//Remove inventory from an event (POST)
		app.post("/notes/remove", function(req, res) {
			//req.url
			console.log("Req for removing note ID " + req.body.id + " from Event ID " + req.body.eventid);
			res.writeHead(200, {
				'Content-Type': 'application/json'
			});
			res.write(JSON.stringify(true).toString("utf-8"));
			res.end();
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