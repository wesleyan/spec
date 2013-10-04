function changePopupColor(event) { //changes the events object
	$("#popupTitleButton").removeClass("btn-success btn-inverse btn-warning btn-danger");
	if (event.valid == false) {
		$("#popupTitleButton").addClass("btn-inverse");
	} else if (event.staffAdded == 0) {
		$("#popupTitleButton").addClass("btn-danger");
	} else if (event.staffAdded < event.staffNeeded) {
		$("#popupTitleButton").addClass("btn-warning");
	} else if (event.staffAdded == event.staffNeeded) {
		$("#popupTitleButton").addClass("btn-success");
	}
}

$('#eventButton').click(function(e) {
	$('#eventButton').addClass('disabled');
	$('#popup').modalPopover('hide');
});

resizeMap = function() {
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
		var width = dayCol.width() - 2;
		timeline.css({
			left: left + "px",
			width: width + "px"
		});
	}
}

function dropdownActiveFix() {
	$('a').removeClass('drop-active');
	$('a[href="#' + Backbone.history.fragment + '"]').addClass('drop-active');
}

$('.modal').on('show', function() {
	$('#popup').css('opacity', 0.7);
}).on('hide', function() {
	$('#popup').css('opacity', 1);
});

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


//User info must be imported for this part: work on BACKBONE JS SESSION
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
	if (filter == null) {
		//Show all of events
		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className = _.without(event.className, 'hide');
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log('all');

	} else if (filter == 'hideCancelled') {

		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className = _.without(event.className, 'hide');
			if (event.valid == false) {
				event.className.push('hide');
			}
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log(filter);
	} else if (filter == 'unstaffed') {
		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className = _.without(event.className, 'hide');
			if (event.staffAdded == event.staffNeeded || event.valid == false) {
				event.className.push('hide');
			}
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log(filter);
	} else if (filter == 'onlyMine') {
		$('#calendar').fullCalendar('clientEvents', function(event) {
			event.className = _.without(event.className, 'hide');
			if (event.people.indexOf(username) == -1) {
				event.className.push('hide');
			}
			$('#calendar').fullCalendar('updateEvent', event);
		});
		console.log(filter);
	}
});

Backbone.history.start();

NotesView = Backbone.View.extend({
        initialize: function(){
            this.render();
        },
        render: function(){
            //Pass variables in using Underscore.js Template
            var variables = { eventid: this.options.eventid };
            // Compile the template using underscore
            var template = _.template( $("#notes_template").html(), variables );
            // Load the compiled HTML into the Backbone "el"
            $("#notes").html( template );
        }
    });

//incomplete
StaffView = Backbone.View.extend({
        initialize: function(){
            this.render();
        },
        render: function(){
            //Pass variables in using Underscore.js Template
            var variables = { eventid: this.options.eventid };
            // Compile the template using underscore
            var template = _.template( $(".modal-body").html(), variables );
            // Load the compiled HTML into the Backbone "el"
            $("#notes").html( template );
        }
    });





var lastClickedEvent;
$('a[href="#staffEvent"]').click(function(e) {
	//This part should get the event data and update staff adding modal box
	$('.eventName').html(lastClickedEvent.title);
	$.ajax({
		type: "GET",
		url: "staff/get/" + lastClickedEvent.id,
	}).done(function(staff) {
		//staff rendering will happen here
		var staff_view = new StaffView({ 'event': lastClickedEvent, 'staff': staff });
		/*$.each(staff, function(key, value) {
		});*/
	});
});


// Solves Bootstrap typeahead dropdown problem

$('#collapseTwo').on('click shown keydown', function() {
		$(this).css('overflow', 'visible');
	}).on('hide', function() {
		$(this).css('overflow', 'hidden');
	});

/*$('button[data-target="#viewdetails"]').click(function() {
	$(this).toggleClass("active");
});*/

var _inventoryProto = {
	suggestion_url: "inventory/all",
	//These methods below have to send AJAX requests to update the inventory.
	onRemove: function(pill) {
		var id = pill.data('tag-id');
		$.ajax({
			type: "POST",
			url: "inventory/remove",
			data: {
				eventid: lastClickedEvent.id,
				inventoryid:pill.data('tag-id')
			}
		}).done(function(msg) {
			console.log('pill with ID ' + id + ' removed');
		});
	},
	onBeforeAdd: function(pill) { //this also works for initial/on modal click loading.
		var id = pill.data('tag-id');
		console.log('initial pill with ID ' + id + ' added');
		return pill; //has to return pill
	},
	onBeforeNewAdd: function(pill) { //this also works for initial/on modal click loading.
		var id = pill.data('tag-id');
		$.ajax({
			type: "POST",
			url: "inventory/add",
			data: {
				eventid: lastClickedEvent.id,
				inventoryid: pill.data('tag-id')
			}
		}).done(function(msg) {
			console.log('pill with ID ' + id + ' added');
		});
		return pill; //has to return pill
	}
};


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
			//This function should contain specific stuff like opening the event-based selection/description box etc
			
			//front-end eye-candy stuff
			symbol = '';
			if (calEvent.video == true) {
				symbol += '<i class="icon-facetime-video"></i> ';
			}
			$('#popup').modalPopover('show');
			$('#eventButton').removeClass('disabled');
			changePopupColor(calEvent);

			//Popover update with event information (can be hidden in a Backbone view)
			$('#popupTitle').html(symbol + calEvent.title);
			$('#popupStaffInfo').html(calEvent.staffAdded + '/' + calEvent.staffNeeded);
			$('#popupContentInside').html(calEvent.desc);
			$('#popupContentHeader').html('<b>' + defaults.dayNames[calEvent.start.getDay()] + ' | ' + calEvent.loc + '</b>');
			
			//Inventory update
			var inventoryOptions = {
				values_url: 'inventory/existing/' + calEvent.id,
			};
			$.extend(inventoryOptions,_inventoryProto);
			$('#inventory').html('');
			$('#inventory').tags(inventoryOptions);

			//Notes update
			var note_view = new NotesView({ eventid: calEvent.id });

			lastClickedEvent = calEvent;
		},
		eventRightClick: function(calEvent, jsEvent, view) {
			jsEvent.preventDefault(); //Right click event only prevents default because context menu is binded in eventRender
			lastClickedEvent = calEvent;
		},
		eventRender: function(event, element) {
			//Adding all events to an array for event filtering with Backbone.js router
			symbol = '';
			if (event.video == true) {
				symbol += '<i class="icon-facetime-video icon-white"></i> ';
			}
			element.find('.fc-event-title').html(symbol + event.title);
			element.contextmenu({
				'target': '#context-menu'
			});

		},
		viewRender: function(view, element) {
			//console.log(view.name);
			try {
				setTimeline();
			} catch (err) {}
		},
		newEventsComplete: function() { //after each ajax request to the server, new events also filtered by this way
			var currentUrl = Backbone.history.fragment;
			if (currentUrl != '') {
				app.navigate('', {
					trigger: true
				});
				app.navigate(currentUrl, {
					trigger: true
				});
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

	var ComboboxInitiation = function() {
		$.ajax({
			type: "GET",
			url: "staff/all/",
		}).done(function(staff) {
			$('.combobox').html('');
			$.each(staff, function(key, value) {
				$('.combobox')
					.append($('<option>', {
							value: key
						})
						.text(value));
			});
			$('.combobox').combobox({
				placeholder: 'Choose a staff'
			});
		});
	}
	ComboboxInitiation();
});