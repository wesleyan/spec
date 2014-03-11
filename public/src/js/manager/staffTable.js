var user = '';
$(document).ready(function() {
  //storeAllStaff loading...
  $.ajax({
    type: "GET",
    url: "../staff/all/",
  }).done(function(staff) {
    storeAllStaff = staff;
  });
  _.templateSettings.variable = "rc";
  $('body').html(fixParantheses($('body').html()));
  $('body').html(fixParantheses($('body').html()));
  //this is important because some HTML characters consist of other HTML characters, so double decoding is needed
  var today = new Date();
  today.setHours(0,0,0,0);
  var lastWeek = new Date(today.getTime() - 24 * 60 * 60 * 1000 * 7);
  $('.date').datepicker();
  $('#d1').datepicker('setValue', lastWeek);
  $('#d2').datepicker('setValue', today);
  $('#send').click(function(e) {
    $.ajax({
      type: "GET",
      url: "../staff/table",
      data: {
        'start': $('#d1').data('datepicker').date,
        'end': $('#d2').data('datepicker').date,
      }
    }).done(function(msg) {
      if (msg === false) {
        return false;
      }

      lazy = storeAllStaff.filter(function(person) {
        return typeof msg[person.username] === 'undefined';
      }).filter(function(person) {
        return !person.professional;
      }).filter(function(person) {
        if (typeof person.task != 'undefined') {
          return person.task.indexOf('events') > -1;
        } else if (person.trainee) {
          return true;
        }
        return false;
      });

      var template = _.template($(".template").html(), {
        'staff': msg,
        'lazy': lazy
      });
      //console.log(template);
      $('#content').html(template);
    });
  });

});

var addTaskIcon = function (person) {
  var html = '';
  if(person.task) {
    if(person.task.indexOf('postpro') !== -1) {
      //add post pro icon
      html += ' <i class="icon-film" title="Post-Production"></i>';
    }
    if(person.task.indexOf('dataentry') !== -1) {
      //add data entry icon
      html += ' <i class="icon-file" title="Data Entry / Inventory"></i>';
    }
  }

  return html;
}