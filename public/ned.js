/*
  ____                     
 / ___|  _ __    ___   ___ 
 \___ \ | '_ \  / _ \ / __|
  ___) || |_) ||  __/| (__ 
 |____/ | .__/  \___| \___|
        |_|                
*/
var Spec = {}; //the only global variable that is supposed to be used in this application.
Spec = { 
	storeAllStaff: [],
	username: '',
	permission:0, //this is only for practical reasons, backend will always check for permission with session information
	lastClickedEvent: {},
	View: {},
	filter: '',
	updateUser: function() {
		$.ajax({
			type: "GET",
			url: "user/",
		}).done(function(info) {
			Spec.username = info.username;
			Spec.permission = info.permission;
		});
	},
	dropdownActiveFix: function() {
		$('a').removeClass('drop-active');
		$('a[href="#' + Backbone.history.fragment + '"]').addClass('drop-active');
	},
	changePopupColor: function (event) {
		$("#popupTitleButton").removeClass("btn-success btn-inverse btn-warning btn-danger btn-info");
		if (event.valid == false) {
			$("#popupTitleButton").addClass("btn-inverse");
		} else if (event.shifts.length == 0) {
			$("#popupTitleButton").addClass("btn-danger");
		} else if (event.shifts.length < event.staffNeeded) {
			$("#popupTitleButton").addClass("btn-warning");
		} else if (event.shifts.length == event.staffNeeded) {
			$("#popupTitleButton").addClass("btn-success");
		} else if (event.shifts.length > event.staffNeeded) {
			$("#popupTitleButton").addClass("btn-info");
		}

		$('#popupStaffInfo').html(event.shifts.length + '/' + event.staffNeeded);
	},
	resizeMap: function() {
		var column_height = $(window).height();
		$('#calendar').fullCalendar('option', 'height', column_height - 40); //$("#calendar").css("height", + "px")
	}, //end resizeMap
	setTimeline: function(view) { //this is borrowed from stackoverflow
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
	}, //end setTimeline
	formatAMPM: function(date) {
	  var hours = date.getHours();
	  var minutes = date.getMinutes();
	  var ampm = hours >= 12 ? 'PM' : 'AM';
	  hours = hours % 12;
	  hours = hours ? hours : 12; // the hour '0' should be '12'
	  minutes = minutes < 10 ? '0'+minutes : minutes;
	  var strTime = hours + ':' + minutes + ' ' + ampm;
	  return strTime;
	}, //end formatAMPM
	getFormattedDate: function(date) {
	  var year = date.getFullYear();
	  var month = (1 + date.getMonth()).toString();
	  month = month.length > 1 ? month : '0' + month;
	  var day = date.getDate().toString();
	  day = day.length > 1 ? day : '0' + day;
	  return month + '/' + day + '/' + year;
	}, //end getFormattedDate
	_inventoryProto: {
		only_suggestions: true,
		suggestion_url: "inventory/all",
		//These methods below have to send AJAX requests to update the inventory.
		onRemove: function(pill) {
			var id = pill.data('tag-id');
			$.ajax({
				type: "POST",
				url: "inventory/remove",
				data: {
					eventid: Spec.lastClickedEvent['_id'],
					inventoryid:pill.data('tag-id')
				}
			}).done(function(msg) {
				console.log('pill with ID ' + id + ' removed');
			});
		},
		onBeforeAdd: function(pill) { //this also works for initial/on modal click loading.
			//var id = pill.data('tag-id');
			//console.log('initial pill with ID ' + id + ' added');
			return pill; //has to return pill
		},
		onBeforeNewAdd: function(pill) { //this also works for initial/on modal click loading.
			var id = pill.data('tag-id');
			$.ajax({
				type: "POST",
				url: "inventory/add",
				data: {
					eventid: Spec.lastClickedEvent['_id'],
					inventoryid: pill.data('tag-id')
				}
			}).done(function(msg) {
				console.log('pill with ID ' + id + ' added');
			});
			return pill; //has to return pill
		}
	}, //end _inventoryProto
	decodeEntities: function(s){
	    var str, temp = document.createElement('p');
	    temp.innerHTML= s;
	    str = temp.textContent || temp.innerText;
	    temp =null;
	    return str;
	}, //end decodeEntries
	eventSource: function() { 
		return {
				url: 'events/?filter=' + Spec.filter, // Shows all events BUT need it to show only events to certain location
				ignoreTimezone: false
			};
	}, //end eventSource
	refetchEvents: function() {
		$('#calendar').fullCalendar('changeView', 'month');
		$('#calendar').fullCalendar('removeEvents'); //for fetching the whole month events
		$('#calendar').fullCalendar('addEventSource', Spec.eventSource());
		$('#calendar').fullCalendar('changeView', 'agendaWeek');
	}, //end refetchEvents
	techTemplateUpdate: function() {
		if(Spec.lastClickedEvent.duration == false) {
	    	$('#technician').html('<b>setup and breakdown</b> only.');
	    } else {
	    	$('#technician').html('<b>duration of event</b>.');
	    }
	}, //end techTemplateUpdate
};
//User info must be imported for this part

// BACKBONE.JS ROUTER SECTION
var AppRouter = Backbone.Router.extend({
	routes: {
		"printToday": "printToday",
		"*filter": "all"
	}
});

Spec.app = new AppRouter;

Spec.app.on('route:printToday', function() {
	console.log('printToday');
});

Spec.app.on('route:all', function(filter) {
	Spec.dropdownActiveFix();
	Spec.filter = filter;
	Spec.refetchEvents();
	console.log(filter);
});

Backbone.history.start();

// BACKBONE.JS VIEWS Spec.View.*
_.templateSettings.variable = "op";
$.fn.editable.defaults.mode = 'inline';   //toggle `popup` / `inline` mode
Spec.View.Edit = Backbone.View.extend({
        initialize: function(){
            this.render();
            Spec.storeEdited = {};
		    $('#title').editable();
		    $('#desc').editable({
		        title: 'Description',
		        rows: 4
		    });
		    $('#loc').editable();
		     $('#startDate').editable({
		        format: 'yyyy-mm-dd',    
		        viewformat: 'mm/dd/yyyy',    
		        datepicker: {
		                weekStart: 1
		           }
			});
	     	$('.bootstrap-timepicker input').timepicker({
			});
			$('.bootstrap-timepicker input').on('show.timepicker', function(e) {
				$(this).prev().toggle();
			});
			$('#editSpinner').spinner();


			$('.x-edit-event').on('save', function(e, params) {
				var result = {};
				result[this.id] = params.newValue;
			    $.extend(Spec.storeEdited, result)
			});

        },
        render: function(){
            var variables = { event: Spec.lastClickedEvent};
            var template = _.template( $("#edit_template").html(), variables );
            $("#editEvent .modal-body").html( template );
        }
    });

Spec.View.Remove = Backbone.View.extend({
        initialize: function(){
            this.render();
        },
        render: function(){
            var variables = { event: Spec.lastClickedEvent};
            var template = _.template( $("#remove_template").html(), variables );
            $("#removeEvent").html( template );
        }
    });

Spec.View.Notes = Backbone.View.extend({
        initialize: function(options){
            this.render(options);
            options.notes.forEach(function(note) {
            	var each_note_view = new Spec.View.EachNote(note);
            });
        },
        render: function(options){
            var variables = { eventid: Spec.lastClickedEvent['_id'], notes: options.notes };
            var template = _.template( $("#notes_template").html(), variables );
            $("#notes").html( template );
        }
    });

Spec.View.EachNote = Backbone.View.extend({
        initialize: function(note){
            this.render(note);
            var removedItem;
        },
        render: function(note){
            var variables = { eventid: Spec.lastClickedEvent['_id'], 'note': note };
            var template = _.template( $("#each_note_template").html(), variables );
            $("#notesBody").append( template );
        }
    });

Spec.View.Staff = Backbone.View.extend({
        initialize: function(options){
            this.render(options);
        },
        render: function(options){
            var variables = {'shifts': options.shifts };
            var template = _.template( $("#staff_template").html(), variables );
            $("#staffEvent .modal-body").html( template );
            Spec.techTemplateUpdate();
            options.shifts.forEach(function(shift) {
            	var each_note_view = new Spec.View.EachStaff({ 'item': shift });
            });
            Spec.newRowInit(options.shifts.slice(-1)[0]);
            $('.combobox').combobox({
				placeholder: 'Choose a staff'
			});
			$('#staffSpinner').spinner();
			$('#staffSpinner').on('changed', function(e, val) {
				$.ajax({
					type: "POST",
					url: "event/spinner",
					data: {
						eventid: Spec.lastClickedEvent['_id'],
						make: val
					}
				}).done(function(msg) {
					Spec.refetchEvents();
					Spec.lastClickedEvent.staffNeeded = parseInt(val);
					Spec.changePopupColor(Spec.lastClickedEvent);
					console.log('event with ID ' + Spec.lastClickedEvent['_id'] + ' staff number changed to ' + val);
				});
			}); //end of staffSpinner
        }
    });
Spec.View.EachStaff = Backbone.View.extend({
        initialize: function(options){
            this.render(options);
        },
        render: function(options){
            var variables = {'item': options.item };
            var template = _.template( $("#each_staff_template").html(), variables );
            $("#staffEvent .modal-body tbody").prepend( template );
        }
    });

Spec.newRowInit = function (lastShift) {
	if(lastShift == undefined) {
		var startTime = Spec.formatAMPM(Spec.lastClickedEvent.start);
		var endTime = Spec.formatAMPM(Spec.lastClickedEvent.end);
	} else {
		var startTime = Spec.formatAMPM(new Date(Date.parse(lastShift.start)));
		var endTime = Spec.formatAMPM(new Date(Date.parse(lastShift.end)));
	}
 	$('#timepicker5').timepicker({
		defaultTime: startTime
	});
	$('#timepicker6').timepicker({
		defaultTime: endTime
	});
	$('.bootstrap-timepicker input').on('show.timepicker', function(e) {
		$(this).prev().toggle();
  	});
	$('.combobox').html('');
	Spec.storeAllStaff.forEach(function(person) {
		if(person.name == false) {return;}
		$('.combobox')
			.append($('<option>', {
					'value': person.username
				})
				.text(person.name + ' (' + person.username + ')'));
	});
}

$(document).ready(function() {
	//Spec.updateUser();
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
		//defaultView: 'agendaWeek',
		editable: false,
		allDaySlot: false,
		allDayDefault: false,
		firstDay: date.getDay(),
		eventBorderColor: 'black',
		windowResize: function(view) {
			Spec.resizeMap();
		},
		eventClick: function(calEvent, jsEvent, view) {
			Spec.lastClickedEvent = calEvent;
			//This function should contain specific stuff like opening the event-based selection/description box etc
			$('#popup').modalPopover('hide');
			//front-end eye-candy stuff
			symbol = '';
			if (calEvent.video == true) {
				symbol += '<i class="icon-facetime-video"></i> ';
			}
			
			$('#eventButton').removeClass('disabled');
			Spec.changePopupColor(calEvent);

			//Popover update with event information (can be hidden in a Backbone view)
			$('#popupTitle').html(symbol + Spec.decodeEntities(calEvent.title));
			var inside = 
			Spec.decodeEntities(calEvent.desc);
			$('#popupContentInside').html(inside);
			try {
			$('#popupContentHeader').html('<b>' + defaults.dayNames[calEvent.start.getDay()] + ' | ' + Spec.decodeEntities(calEvent.loc) + '</b>'+
				'<br><i class="icon-time"></i> <b>'+Spec.formatAMPM(calEvent.start)+'</b> ' + ' <i>'+ Spec.formatAMPM(new Date(Date.parse(calEvent.eventStart)))+'</i>' +
				' <i class="icon-arrow-right"></i>   <i>'+ Spec.formatAMPM(new Date(Date.parse(calEvent.eventEnd)))+'</i>' + ' <b>'+Spec.formatAMPM(calEvent.end)+'</b>'
				);
			} catch(err) {
				$('#popupContentHeader').html('<b>' + defaults.dayNames[calEvent.start.getDay()] + ' | ' + Spec.decodeEntities(calEvent.loc) + '</b>');
				$.bootstrapGrowl("Time data of the event <b>" + Spec.lastClickedEvent.title + "</b> is improper. Please edit the event to make it's data type valid.", {
				  type: 'error',
				  align: 'center',
				  delay: 40000,
				});
			}
			//Inventory update
			var inventoryOptions = {
				values_url: 'inventory/existing/' + calEvent['_id'],
			};
			$.extend(inventoryOptions,Spec._inventoryProto);
			$('#inventory').html('');
			$('#inventory').tags(inventoryOptions);

			//Notes update
			$.ajax({
				type: "GET",
				url: "notes/existing/" + calEvent['_id'],
			}).done(function(notes) {
				$('#popup').modalPopover('show');
				var note_view = new Spec.View.Notes({'notes':notes });
			});

		},
		eventRightClick: function(calEvent, jsEvent, view) {
			jsEvent.preventDefault(); //Right click event only prevents default because context menu is binded in eventRender
			if(calEvent.valid == true) {
				$('a[href="#cancelEvent"] span').text("Cancel this event");
			} else {
				$('a[href="#cancelEvent"] span').text("Uncancel this event");
			}
			Spec.lastClickedEvent = calEvent;
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
				Spec.setTimeline();
			} catch (err) {}
		},
		eventSources: [Spec.eventSource()]
	});

	//Important: especially not using defaultView option of FullCalendar, for efficient use of lazyFetching.
	$('#calendar').fullCalendar('changeView', 'agendaWeek');
	//Loads the whole month events, and shows them from memory, instead of a new request for each prev/next click.
	Spec.resizeMap();
	$('#leftGroup').prependTo('.fc-header-left');
	$('#rightGroup').appendTo('.fc-header-right');

	//storeAllStaff loading...
	$.ajax({
		type: "GET",
		url: "staff/all/",
	}).done(function(staff) {
		Spec.storeAllStaff = staff;
	});

	// JQUERY EVENTS
	$('#eventButton').click(function(e) {
		$('#eventButton').addClass('disabled');
		$('#popup').modalPopover('hide');
	});
	$('#addNote').click(function(e) {
		$('#newNote').modal('show');
		return false;
	});
	$('#newNote textarea').bind('keypress', function(e) {
	  if ((e.keyCode || e.which) == 13) {
	    $( "#noteSubmit" ).trigger("click");
	    return false;
	  }
	});
	$('#noteSubmit').click(function(e) {
		$('#newNote').modal('hide');
		var note = $('#newNote textarea').val();
		if(note === '' ) {return false;}
		$.ajax({
			type: "POST",
			url: "notes/add",
			data: {
				'note': note,
				eventid: Spec.lastClickedEvent['_id']
			}
		}).done(function(res) {
			console.log('note added to event ID ' + Spec.lastClickedEvent['_id'] + ': ' + note);
			//console.log(msg);
			var each_note_view = new Spec.View.EachNote({ //Backbone new note view used
					'id': res.id,
					'text': note,
					'user': res.user,
					'date': new Date()
			});
		});
		$('#newNote textarea').val('');
	});
	$('.modal').on('show', function() {
		$('#popup').css('opacity', 0.7);
	}).on('hide', function() {
		$('#popup').css('opacity', 1);
	});
	$('a[href="#staffEvent"]').click(function(e) {
		//This part should get the event data and update staff adding modal box
		$.ajax({
			type: "GET",
			url: "staff/get/" + Spec.lastClickedEvent['_id'],
		}).done(function(shifts) {
			//staff rendering will happen here
			for(i = 0; i < shifts.length; i++) {
				var staffProfile = Spec.storeAllStaff.filter(function(staff) {
					return staff.username == shifts[i].staff;
				})[0];
				if(staffProfile == undefined) {
					shifts[i].staffname = '';
				} else {
					shifts[i].staffname = staffProfile.name;
				}
			}
			var staff_view = new Spec.View.Staff({'shifts': shifts });
		});
	});
	$('a[href="#editEvent"]').click(function(e) {
		//This part should get the event data and update the event editing modal box
		var edit_view = new Spec.View.Edit();
	});
	$('a[href="#removeEvent"]').click(function(e) {
		//This part should get the event data and update the event editing modal box
		var remove_view = new Spec.View.Remove();
	});
	$('a[href="#cancelEvent"]').click(function(e) {
		$.ajax({
			type: "POST",
			url: "event/cancel",
			data: {
				eventid: Spec.lastClickedEvent['_id'],
				make: !Spec.lastClickedEvent['valid']
			}
		}).done(function(msg) {
			console.log('event with ID ' + Spec.lastClickedEvent['_id'] + ' cancel toggled');
			Spec.refetchEvents();
		});
	});


	$('body').on('click','.toggleDuration',function(e) {
		$.ajax({
			type: "POST",
			url: "event/duration",
			data: {
				eventid: Spec.lastClickedEvent['_id'],
				make: !Spec.lastClickedEvent['duration']
			}
		}).done(function(msg) {
			Spec.refetchEvents();
			Spec.lastClickedEvent['duration'] = !Spec.lastClickedEvent['duration'];
			Spec.techTemplateUpdate();
			console.log('event with ID ' + Spec.lastClickedEvent['_id'] + ' duration toggled');
		});
	});
	$('body').on('click','.toggleVideo',function(e) {
		$.ajax({
			type: "POST",
			url: "event/video",
			data: {
				eventid: Spec.lastClickedEvent['_id'],
				make: !Spec.lastClickedEvent['video']
			}
		}).done(function(msg) {
			Spec.refetchEvents();
			Spec.lastClickedEvent['video'] = !Spec.lastClickedEvent['video'];
			$('#popup').modalPopover('hide');
			console.log('event with ID ' + Spec.lastClickedEvent['_id'] + ' video toggled');
		});
	});
	$('body').on('click','.removeNote', function(e) {
		removedItem = this;
		var noteid = $(this).attr('href');
		$.ajax({
			type: "POST",
			url: "notes/remove",
			data: {
				'id': noteid,
				eventid: Spec.lastClickedEvent['_id']
			}
		}).done(function(msg) {
			console.log('note removed from event ID ' + Spec.lastClickedEvent.id + ', ID: ' + noteid);
			$(removedItem).parent().parent().remove();
		});
		return false;
	});
    $('body').on('click','#removeEvent .btn-danger',function(e) {
		$.ajax({
			type: "POST",
			url: "event/remove",
			data: {
				eventid: Spec.lastClickedEvent['_id']
			}
		}).done(function(msg) {
			console.log('event with ID ' + Spec.lastClickedEvent['_id'] + ' removed');
			Spec.refetchEvents();
			$('#popup').modalPopover('hide');
			$('#removeEvent').modal('hide');
		});
	});
    $('body').on('click','.removeStaff', function(e) {
		removedItem = this;
		var shiftid = $(this).attr('href');
		$.ajax({
			type: "POST",
			url: "staff/remove",
			data: {
				'id': shiftid,
				'eventid': Spec.lastClickedEvent['_id']
			}
		}).done(function(msg) {
			Spec.lastClickedEvent.shifts.pop();
			Spec.changePopupColor(Spec.lastClickedEvent);
			Spec.refetchEvents();
			console.log('staff removed from event ID ' + Spec.lastClickedEvent['_id'] + ', ID: ' + shiftid);
			$(removedItem).parent().parent().remove();
		});
		return false;
	});
	$('body').on('click','#addNewStaff',function(e) {
		if($('.combobox').val() == '') {
			$.bootstrapGrowl("You must choose a staff to add a valid shift.", {
			  type: 'error',
			  align: 'center',
			  delay: 2000,
			});
			return false;		
		}
			var chosenStaff = $('.combobox').val().match(/\(([^)]+)\)/)[1];
		$.ajax({
			type: "POST",
			url: "staff/add",
			data: {
				'staff': chosenStaff,
				'start': $('#timepicker5').val(),
				'end': $('#timepicker6').val(),
				'eventid': Spec.lastClickedEvent['_id'],
				'eventStart': Spec.lastClickedEvent.start,
				'eventEnd': Spec.lastClickedEvent.end,
			}
		}).done(function(res) {
			Spec.refetchEvents();


			console.log('staff added to event ID ' + Spec.lastClickedEvent['_id'] + ': ' + res.id);
			var newShift = {
					'id': res.id,
					'start': res.start,
					'end': res.end,
					'staff': chosenStaff,
					'staffname': $('.combobox').val().substring(0, $('.combobox').val().indexOf('(')-1),
				};
			var each_staff_view2 = new Spec.View.EachStaff({ //Backbone new note view used
				'item': newShift
			});
			if($.grep(Spec.lastClickedEvent.shifts, function(e){ return e.staff == chosenStaff; }).length > 0) {
				$.bootstrapGrowl("You have chosen this staff for another shift before, shift is added but you may want to check it again.", {
				  type: 'info',
				  align: 'center',
				  delay: 20000,
				});
			}
			Spec.lastClickedEvent.shifts.push(newShift);
			Spec.changePopupColor(Spec.lastClickedEvent);
			$('.combobox').val('');
		}); //done function
	}); 	//click event

	$('#editEvent .modal-footer .btn-primary').click(function(e) {
		var editTimepickers = [$('#timepickerResStart'), $('#timepickerResEnd'), $('#timepickerEventStart'), $('#timepickerEventEnd')];
		editTimepickers.forEach(function (pick) {
			//if(!(pick.val() == pick.prop('defaultValue') || pick.val().substr(1) == pick.prop('defaultValue'))) {
				var result = {};
				result[pick.prop('id')] = pick.val();
				$.extend(Spec.storeEdited,result);
			//}  //then decided to send all hour/min data all the time
		});
		Spec.storeEdited.date = new Date(Date.parse($.trim($('#startDate').text())));
		Spec.storeEdited.staffNeeded = $('#editSpinner input').val();
		$.ajax({
			type: "POST",
			url: "event/edit",
			data: {
				'eventid': Spec.lastClickedEvent['_id'],
				'changedData': Spec.storeEdited
			}
		}).done(function(res) {
			Spec.refetchEvents();
			$('#editEvent').modal('hide');
			$('#popup').modalPopover('hide');
			var title = Spec.storeEdited.title;
			if(title == undefined) {
				title = Spec.lastClickedEvent.title;
			}
			$.bootstrapGrowl("The event <b>" + title + '</b> is edited and saved.' , {
			  type: 'info',
			  align: 'center',
			  delay: 2000,
			});
			Spec.storeEdited = {};
		}); //done function
	});


	// Solves Bootstrap typeahead dropdown overflow problem
	$('#collapseTwo').on('click shown keydown', function() {
		$(this).css('overflow', 'visible');
	}).on('hide', function() {
		$(this).css('overflow', 'hidden');
	});
});

$(document).ajaxStart(function() {
	$("#eventButton i").removeClass('icon-book');
	$("#eventButton i").addClass('icon-refresh');
});

$(document).ajaxStop(function() {
	$("#eventButton i").removeClass('icon-refresh');
	$("#eventButton i").addClass('icon-book');
});