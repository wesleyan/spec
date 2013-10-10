var databaseUrl = "spec"; // "username:password@example.com/mydb"
var collections = ["events"]
var db = require("mongojs").connect(databaseUrl, collections);
var mongo = require('mongodb-wrapper');

var fs = require('fs');
var parser = require('xml2json');

var xml = fs.readFileSync('Copy of IMS for Export.xml');
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
	processed.push({
		title: data['Event_x0020_Name'],
		desc: data['Notes'],
		loc: data['Room_x0020_Description'],
		staffAdded: 0,
		staffNeeded: 1,
		start: reservedStart,
		end: reservedEnd,
		'eventStart': eventStart,
		'eventEnd': eventEnd,
		'valid': valid,
		duration: true,
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

var express = require('express');

var app = express();

app.get("/", function(req, res) {
	//req.url
	console.log("Req " + req.url);
	res.writeHead(200, {
		'Content-Type': 'application/json'
	});
	res.write(JSON.stringify(processed).toString("utf-8"));
	res.end();
});

app.listen(2000);
console.log('Listening on port 2000');