//New NED
var express = require('express');

var app = express();
var path = require('path');

var date = new Date();
//var diff = date.getTimezoneOffset()/60;
var diff =0;

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
					loc: 'ESC 184 (Woodhead Lounge)',
					staffAdded: 1,
					staffNeeded: 1,
					start: new Date(y, m, d, 9-diff, 45),
					end: new Date(y, m, d, 13-diff, 30),
					valid: true,
					duration: true,
					people: ['ckorkut']
				},
				{
					id: 2,
					title: 'Reception: Prof. F. Reeve Memorial & Reception',
					desc: 'Client would like technician to arrive at 1pm to set up laptop to play CDs during the reception. Client would like to have the technician on hand for two hours. Please bring handheld wireless microphone.',
					loc: 'Russell House All Rooms ',
					staffAdded: 1,
					staffNeeded: 1,
					start: new Date(y, m, d, 13-diff, 0),
					end: new Date(y, m, d, 18-diff, 0),
					valid: true,
					duration: false,
					people: ['tskim']
				},
				{
					id: 3,
					title: 'Dance Presentation',
					desc: 'A technician is needed to stay for the duration of the presentation to assist with hooking up a laptop to the ceiling projector to play youtube clips and other things. NOTE: This is for a class so there should be no charge.',
					loc: 'Schonberg Dance Studio',
					staffAdded: 2,
					staffNeeded: 2,
					start: new Date(y, m, d, 13-diff, 15),
					end: new Date(y, m, d, 14-diff, 30),
					valid: true,
					video: true,
					duration: true,
					people: ['jgoh','ckorkut']
				},
				{
					id: 4,
					title: 'Meeting',
					desc:'Please have Heric Flores present on site for the duration of the meeting to serve as AV technician.',
					loc: 'Shanklin 107 (Kerr Lecture Hall)',
					staffAdded: 1,
					staffNeeded: 1,
					start: new Date(y, m, d+1, 10-diff, 30),
					valid: false,
					duration: true,
					people: ['hflores']
				},
				{
					id: 5,
					title: 'Lunch',
					desc:'Please have Heric Flores present on site at 8am and remain for the duration of the meeting to serve as AV technician. Presenter will arive at 8:30am and will bring laptop. Please connect presenter`s laptop to projection and project onto the screen on the west wall. Provide lavaliere mic for presenter.',
					loc: 'Usdan 300 (Daniel Family Commons & Lounge)',
					staffAdded: 1,
					staffNeeded: 2,
					start: new Date(y, m, d, 12, 0),
					end: new Date(y, m, d, 14, 0),
					valid: true,
					duration: false,
					people: ['hflores']
				},
				{
					id: 6,
					title: 'Birthday Party',
					desc:'Please arrive at 19:00 pm (promptly) to set up the existing computer, projector, and screen. Please plan to stay for the entire event to troubleshoot if necessary.',
					loc: 'Beckham Hall',
					staffAdded: 0,
					staffNeeded: 1,
					start: new Date(y, m, d+1, 19-diff, 0),
					end: new Date(y, m, d+2, 2-diff, 30),
					valid: true,
					duration: true,
					people: []
					//url: 'http://google.com/'
				}
			];


function addBackgroundColor(events) { //changes the events object
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
events = addBackgroundColor(events);

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
    console.log("Req for events starting at " + start.toDateString() + " and ending before " + end.toDateString());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify(events).toString("utf-8"));
    res.end();
});

/*app.get('/', function (req, res) {
  res.render('index',
  { title : 'Home' }
  )
});*/

app.listen(8080);
console.log('Listening on port 8080');