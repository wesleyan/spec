//New NED
var express = require('express');

var app = express();
var path = require('path');

var date = new Date();
var diff = date.getTimezoneOffset()/60;

var d = date.getDate();
var m = date.getMonth();
var y = date.getFullYear();

var color = {
	'green':'#097054',
	'red':'#9E3B33',
	'yellow': '#E48743',
	'gray': '#666666'
}

var events = [
				{
					id: 1,
					title: 'Luncheon: Division III NSM Luncheon',
					desc: 'Please arrive at 11:30 am to help set up the existing projector and screen. Client will bring their own PC laptop.',
					staffAdded: 1,
					staffNeeded: 1,
					start: new Date(y, m, d, 9-diff, 45),
					end: new Date(y, m, d, 13-diff, 30),
					valid: true
				},
				{
					id: 2,
					title: 'Reception: Prof. F. Reeve Memorial & Reception',
					staffAdded: 1,
					staffNeeded: 1,
					start: new Date(y, m, d, 13-diff, 0),
					end: new Date(y, m, d, 18-diff, 0),
					valid: true
				},
				{
					id: 3,
					title: 'Dance Presentation',
					desc: 'A technician is needed to stay for the duration of the presentation to assist with hooking up a laptop to the ceiling projector to play youtube clips and other things. NOTE: This is for a class so there should be no charge.',
					staffAdded: 1,
					staffNeeded: 1,
					start: new Date(y, m, d, 13-diff, 15),
					end: new Date(y, m, d, 14-diff, 30),
					valid: true,
					video: true
				},
				{
					id: 4,
					title: 'Meeting',
					staffAdded: 1,
					staffNeeded: 1,
					start: new Date(y, m, d+1, 10-diff, 30),
					valid: false
				},
				{
					id: 5,
					title: 'Lunch',
					staffAdded: 1,
					staffNeeded: 2,
					start: new Date(y, m, d, 12, 0),
					end: new Date(y, m, d, 14, 0),
					valid: true
				},
				{
					id: 6,
					title: 'Birthday Party',
					staffAdded: 0,
					staffNeeded: 1,
					start: new Date(y, m, d+1, 19-diff, 0),
					end: new Date(y, m, d+2, 2-diff, 30),
					valid: true
					//url: 'http://google.com/'
				}
			];


function addColor(events) { //changes the events object
	for (index = 0; index < events.length; ++index) {
		event = events[index];
		if(event.valid == false) {
			events[index]['backgroundColor'] = color.gray;
		} else if(event.staffAdded == 0) {
			events[index]['backgroundColor'] = color.red;
		}
		else if(event.staffAdded < event.staffNeeded) {
			events[index]['backgroundColor'] = color.yellow;
		} else if(event.staffAdded == event.staffNeeded) {
			events[index]['backgroundColor'] = color.green;
		}
	}
	return events;
}
events = addColor(events);

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});


app.get("/events", function(req,res) {
	//86400s = 1d
	var start = new Date(req.query.start*1000);
	var end = new Date(req.query.end*1000);
	//req.url
    console.log("New request for events starting at " + start.toDateString() + " and ending before " + end.toDateString());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify(events).toString("utf-8"));
    res.end();
});

app.get('/', function (req, res) {
  res.render('index',
  { title : 'Home' }
  )
});

app.listen(8080);
console.log('Listening on port 8080');