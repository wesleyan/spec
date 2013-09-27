var lastClick, lastRightClick;

$(document).ready(function() {

	var date = new Date();
	var d = date.getDate();
	var m = date.getMonth();
	var y = date.getFullYear();


	$('#calendar').fullCalendar({
		header: {
			left: 'prevYear,prev,next,nextYear today',
			center: 'title',
			right: 'month,agendaWeek,agendaDay'

		},
		editable: false,
		allDaySlot: false,
		allDayDefault: false,
		firstDay: date.getDay(),
		eventBorderColor: 'black',
		windowResize: function(view) {
	        resizeMap();
	    },
		eventClick: function(calEvent, jsEvent, view) {
		  //This function should contain specific stuff like opening the event-based selection/description box etc

		  console.log(jsEvent.target + ' Event: ' + calEvent.title + ' & ID: ' + calEvent.id);
		  //$(this).css('background-color','#da4f49');
		},
		eventRightClick: function(calEvent, jsEvent, view) {
		  //This function should contain specific stuff like opening the event-based selection/description box etc
		  jsEvent.preventDefault();
		  //$(this).css('background-color','#da4f49');
		},
		eventRender: function(event, element) {
			if(event.video == true) {
				symbol = '<i class="icon-facetime-video icon-white"></i> ';
			} else {
				symbol = '';
			}                                          
			element.find('.fc-event-title').html(symbol + event.title);
			element.contextmenu({'target':'#context-menu'});
			element.popover({
			  	placement:'right',
			  	trigger: 'hover',
			  	html: true,
			  	content: event.desc,
			  	//title: event.title
			});				  
		},
		viewRender: function(view, element) {
		 	//console.log(view.name);
	        try {
	            setTimeline();
	        } catch(err) {}
	    }
	});
	$('#calendar').fullCalendar('addEventSource', 'events/');
	//Important: especially not using defaultView option of FullCalendar, for efficient use of lazyFetching.
	$('#calendar').fullCalendar('changeView', 'agendaWeek'); 
	//Loads the whole month events, and shows them from memory, instead of a new request for each prev/next click.
	resizeMap();
	$('#leftGroup').prependTo('.fc-header-left');
	$('#rightGroup').appendTo('.fc-header-right');

});



resizeMap = function () {
		var column_height = $(window).height();
		$('#calendar').fullCalendar('option', 'height', column_height - 40);
		//$("#calendar").css("height", + "px")
	};


function setTimeline(view) {
    var parentDiv = jQuery(".fc-agenda-slots:visible").parent();
    var timeline = parentDiv.children(".timeline");
    if (timeline.length == 0) { //if timeline isn't there, add it
        timeline = jQuery("<hr>").addClass("timeline");
        parentDiv.prepend(timeline);
    }

    var curTime = new Date();

    var curCalView = jQuery("#calendar").fullCalendar('getView');
    if (curCalView.visStart < curTime && curCalView.visEnd > curTime) {
        timeline.show();
    } else {
        timeline.hide();
        return;
    }

    var curSeconds = (curTime.getHours() * 60 * 60) + (curTime.getMinutes() * 60) + curTime.getSeconds();
    var percentOfDay = curSeconds / 86400; //24 * 60 * 60 = 86400, # of seconds in a day
    var topLoc = Math.floor(parentDiv.height() * percentOfDay);

    timeline.css("top", topLoc + "px");

    if (curCalView.name == "agendaWeek") { //week view, don't want the timeline to go the whole way across
        var dayCol = jQuery(".fc-today:visible");
        var left = dayCol.position().left + 1;
        var width = dayCol.width()-2;
        timeline.css({
            left: left + "px",
            width: width + "px"
        });
    }

}

/*$('#splitModal').modal({
  keyboard: false,
  show: false
});*/

//Backbone.js Router
var AppRouter = Backbone.Router.extend({

  routes: {
  	"printToday": "printToday",
    "recentVideo": "recentVideo",
    "staffEvent": "staffEvent",
    "hideCancelled": "hideCancelled",
    "unstaffed": "unstaffed",
    "onlyMine": "onlyMine",
    "": "all"
  }

});

var app = new AppRouter;

app.on('route:printToday', function() {
  	console.log('printToday');
});
app.on('route:recentVideo', function() {
  	console.log('recentVideo');
});
app.on('route:staffEvent', function() {
  	console.log('staffEvent');
});

app.on('route:hideCancelled', function() {
  	console.log('hideCancelled');
});
app.on('route:unstaffed', function() {
  	console.log('unstaffed');
});
app.on('route:onlyMine', function() {
  	console.log('onlyMine');
});
app.on('route:all', function() {
  	console.log('all');
});
      
Backbone.history.start();