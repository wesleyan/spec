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

var events = [{
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
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'tskim',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
}, {
	title: 'Reception: Prof. F. Reeve Memorial & Reception',
	desc: 'Client would like technician to arrive at 1pm to set up laptop to play CDs during the reception. Client would like to have the technician on hand for two hours. Please bring handheld wireless microphone.',
	loc: 'Russell House All Rooms ',
	staffAdded: 1,
	staffNeeded: 1,
	start: new Date(y, m, d, 13 - diff, 0),
	end: new Date(y, m, d, 18 - diff, 0),
	valid: true,
	duration: false,
	people: ['tskim'],
	inventory: [{
		"id": "2",
		"text": "Macbook Pro 13",
		"title": "This item needs to be recorded."
	},],
	notes: [{
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'dsongcho',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
}, {
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
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'dsongcho',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
}, {
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
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'dsongcho',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
}, {
	title: 'Lunch',
	desc: 'Please have Heric Flores present on site at 8am and remain for the duration of the meeting to serve as AV technician. Presenter will arive at 8:30am and will bring laptop. Please connect presenter`s laptop to projection and project onto the screen on the west wall. Provide lavaliere mic for presenter.',
	loc: 'Usdan 300 (Daniel Family Commons & Lounge)',
	staffAdded: 1,
	staffNeeded: 2,
	start: new Date(y, m, d, 12, 0),
	end: new Date(y, m, d, 14, 0),
	valid: true,
	duration: false,
	people: ['hflores'],
	inventory: [{
		"id": "1",
		"text": "Projector",
		"title": "This item needs to be recorded."
	},],
	notes: [{
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'dsongcho',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
}, {
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
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Cloie (clogan@wesleyan.edu)',
		user: 'dsongcho',
		date: new Date(y, m, d, 8 - diff, 45)
	}, {
		id: new mongo.ObjectID(),
		text: 'SHADOWING: Austin (dpham@wesleyan.edu)',
		user: 'ckorkut',
		date: new Date(y, m, d, 7 - diff, 45)
	}, ]
}];
events.forEach(function(event) {
	db.events.save(event, function(err, saved) {
		if (err || !saved) console.log("Event not saved");
		else console.log("Event saved");
	});
});