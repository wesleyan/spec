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
    defaultView: 'agendaWeek',
    allDaySlot: false,
    allDayDefault: false,
    firstDay: date.getDay(),
    eventBorderColor: 'black',
    eventClick: function(calEvent, jsEvent, view) {
      //This function should contain specific stuff like opening the event-based selection/description box etc
      //alert('Event: ' + calEvent.title + ' & ID: ' + calEvent.id);
      //$(this).css('background-color','#da4f49');
    },
    viewRender: function(view, element) {
      //alert(view.name);
    }
  });
  $('#calendar').fullCalendar('addEventSource', 'events/');


});