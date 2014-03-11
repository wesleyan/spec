var user = '';
$(document).ready(function() {
  _.templateSettings.variable = "rc";
  $('body').html(fixParantheses($('body').html()));
  $('body').html(fixParantheses($('body').html()));
  //this is important because some HTML characters consist of other HTML characters, so double decoding is needed
  var today = new Date();
  today.setHours(0,0,0,0);
  var lastWeek = new Date(today.getTime() - 24 * 60 * 60 * 1000 * 7);
  $('.combobox').combobox();
  $('.date').datepicker();
  $('#d1').datepicker('setValue', lastWeek);
  $('#d2').datepicker('setValue', today);
  $('#send').click(function(e) {
    try {
      user = $('.combobox').val().match(/\(([^)]+)\)/)[1];
    } catch (err) {
      return false;
    }
    $.ajax({
      type: "GET",
      url: "../staff/check",
      data: {
        'user': user,
        'start': $('#d1').data('datepicker').date,
        'end': $('#d2').data('datepicker').date,
      }
    }).done(function(msg) {
      if (msg === false) {
        return false;
      }
      var template = _.template($(".template").html(), {
        'events': msg
      });
      //console.log(template);
      $('#content').html(template);
    });
  });
});