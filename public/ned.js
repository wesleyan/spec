function changePopupColor(event) { //changes the events object
	$("#popupTitleButton").removeClass("btn-success btn-inverse btn-warning btn-danger");
	if(event.valid == false) {
			$("#popupTitleButton").addClass("btn-inverse");
		} else if(event.staffAdded == 0) {
			$("#popupTitleButton").addClass("btn-danger");
		}
		else if(event.staffAdded < event.staffNeeded) {
			$("#popupTitleButton").addClass("btn-warning");
		} else if(event.staffAdded == event.staffNeeded) {
			$("#popupTitleButton").addClass("btn-success");
	}
}

$('#eventButton').click(function(e) {
	$('#eventButton').addClass('disabled');
	$('#popup').modalPopover('hide');
});

$('.modal').on('show', function () {
  $('#popup').css('opacity', 0.7);
}).on('hide', function () {
  $('#popup').css('opacity', 1);
});

resizeMap = function () {
		var column_height = $(window).height();
		$('#calendar').fullCalendar('option', 'height', column_height - 40);
		//$("#calendar").css("height", + "px")
	};



function setTimeline(view) { //this is borrowed from stackoverflow
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

Array.prototype.removeItem = function(a) {
            for (i = 0; i < this.length; i++) {
                if (this[i] == a) {
                    for (i2 = i; i2 < this.length - 1; i2++) {
                        this[i2] = this[i2 + 1];
                    }
                    this.length = this.length - 1
                    return;
                }
            }
        }

function dropdownActiveFix() {
	$('a').removeClass('drop-active');
	$('a[href="#' + Backbone.history.fragment + '"]').addClass('drop-active');

}


// The functions above are mostly done
var lastClick, lastRightClick;

// BACKBONE.JS ROUTER SECTION
var AppRouter = Backbone.Router.extend({
  routes: {
  	"printToday": "printToday",
    "recentVideo": "recentVideo",
    "*filter": "all"
  }
});


//User info must be imported for this part
var username = 'ckorkut';
      
var app = new AppRouter;

app.on('route:printToday', function() {
  	console.log('printToday');
});
app.on('route:recentVideo', function() {
  	console.log('recentVideo');
});

app.on('route:all', function(filter) {
	dropdownActiveFix();
	if(filter == null) {
		//Show all of events
		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className.removeItem('hide');
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log('all');

	} else if(filter == 'hideCancelled') {
		
		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className.removeItem('hide');
			if(event.valid == false) {
				event.className.push('hide');
			}
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log(filter);
	} else if(filter == 'unstaffed') {
		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className.removeItem('hide');
			if(event.staffAdded == event.staffNeeded || event.valid == false) {
				event.className.push('hide');
			}
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log(filter);
	} else if(filter == 'onlyMine') {
		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className.removeItem('hide');
			if(event.people.indexOf(username) == -1) {
				event.className.push('hide');
			}
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log(filter);
	}
});

Backbone.history.start();

var lastClickedEvent;
$('a[href="#split"]').click(function(e) {
	//Split window update should be done here
	$('.eventName').html(lastClickedEvent.title);
});
$('a[href="#staffEvent"]').click(function(e) {
	//Staff window update should be done here
	$('.eventName').html(lastClickedEvent.title);
});


// Solves Bootstrap typeahead dropdown problem
$('.collapse').on({
    shown: function(){
        $(this).css('overflow','visible');
    },
    hide: function(){
        $(this).css('overflow','hidden');
    }
});

$(document).ready(function() {


	var date = new Date();
	var d = date.getDate();
	var m = date.getMonth();
	var y = date.getFullYear();
			$('#popup').modalPopover({
			    target: '#eventButton',
			    placement: 'bottom',
			    backdrop: false
			});	

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
			symbol = '';
			if(calEvent.video == true) {
				symbol += '<i class="icon-facetime-video"></i> ';  
			} 
		  //This function should contain specific stuff like opening the event-based selection/description box etc
			$('#popup').modalPopover('show');
			$('#eventButton').removeClass('disabled');
			$('#popupTitle').html(symbol + calEvent.title);
			changePopupColor(calEvent);
			$('#popupStaffInfo').html(calEvent.staffAdded + '/' + calEvent.staffNeeded);
			$('#popupContentInside').html(calEvent.desc);
			$('#popupContentHeader').html('<b>' + defaults.dayNames[calEvent.start.getDay()] + ' | ' + calEvent.loc + '</b>');
			lastClickedEvent = calEvent;
		},
		eventRightClick: function(calEvent, jsEvent, view) {
		  jsEvent.preventDefault(); //Right click event only prevents default because context menu is binded in eventRender
		  lastClickedEvent = calEvent;
		},
		eventRender: function(event, element) {
			//Adding all events to an array for event filtering with Backbone.js router
			symbol = '';
			if(event.video == true) {
				symbol += '<i class="icon-facetime-video icon-white"></i> ';  
			}                                   
			element.find('.fc-event-title').html(symbol + event.title);
			element.contextmenu({'target':'#context-menu'});
	  
		},
		viewRender: function(view, element) {
		 	//console.log(view.name);
	        try {
	            setTimeline();
	        } catch(err) {}
	    },
	    newEventsComplete: function() { //after each ajax request to the server, new events also filtered by this way
	    	var currentUrl = Backbone.history.fragment;
	    	if(currentUrl != '') {
	    		app.navigate('', {trigger: true});
	    		app.navigate(currentUrl, {trigger: true});
	    	}
	    },
	    eventSources: [{
	        url: 'events/', // Shows all events BUT need it to show only events to certain location
	        ignoreTimezone: false
	    }],
	});

	//Important: especially not using defaultView option of FullCalendar, for efficient use of lazyFetching.
	$('#calendar').fullCalendar('changeView', 'agendaWeek'); 
	//Loads the whole month events, and shows them from memory, instead of a new request for each prev/next click.
	resizeMap();
	$('#leftGroup').prependTo('.fc-header-left');
	$('#rightGroup').appendTo('.fc-header-right');

	$('#timepicker5').timepicker({
            template: false,
            showInputs: false,
            minuteStep: 5,
            defaultTime: '9:45 AM'
    });
	$('#timepicker6').timepicker({
            template: false,
            showInputs: false,
            minuteStep: 5,
            defaultTime: '11:45 AM'
    });
	$('.combobox').combobox();
	
	$('#inventory').typeahead({
		source: function(query, process) {
	        jQuery.ajax({
	            url : "inventory/video",
	            type : 'GET',
	            dataType : 'json',
	            success : function(json) {
	                process(json);
	            }
	        });
	    }
	});



});




