var fullShiftNumber = function(event) {
  return event.shifts.map(function(s){return s.staff;}).filter(function(n){return n;}).length;
};

var randomColor = function() {
  return '#'+Math.floor(Math.random()*16777215).toString(16);
};

var ordinal = function(i) {
  var j = i % 10;
  if (j == 1 && i != 11) {
    return i + "st";
  }
  if (j == 2 && i != 12) {
    return i + "nd";
  }
  if (j == 3 && i != 13) {
    return i + "rd";
  }
  return i + "th";
};

var getWeek = function(d) {
  //returns [week number, year]
  var j1 = new Date(d.getFullYear(),0,1);
  return [Math.ceil((((d - j1) / 86400000) + j1.getDay()+1)/7), d.getFullYear()];
};

var getDaysBetween = function() {
  var start = new Date($('#d1').data('datepicker').date);
  var end = $('#d2').data('datepicker').date;

  if (start.getTime() > end.getTime()) {
    return [];
  }

  var arr = [];
  while (start.toDateString() !== end.toDateString()) {
    arr.push(start.toDateString());
    start.setDate(start.getDate() + 1);
  }
  arr.push(end.toDateString());
  return arr;
};

var getWeeksBetween = function() {
  var start = new Date($('#d1').data('datepicker').date);
  var end = $('#d2').data('datepicker').date;

  if (start.getTime() > end.getTime()) {
    return [];
  }

  var endWeek = getWeek(end);
  var arr = [];
  while (!_.isEqual(getWeek(start), endWeek)) {
    arr.push(getWeek(start));
    start.setDate(start.getDate() + 7);
  }
  arr.push(getWeek(end));
  return arr;
};

var getMonth = function(d) {
  return [d.getMonth() + 1, d.getFullYear()];
};

var getMonthsBetween = function() {
  var start = new Date($('#d1').data('datepicker').date);
  var end = $('#d2').data('datepicker').date;

  if (start.getTime() > end.getTime()) {
    return [];
  }

  var endMonth = getMonth(end);
  var arr = [];
  while (!_.isEqual(getMonth(start), endMonth)) {
    arr.push(getMonth(start));
    start.setDate(start.getDate() + 30);
  }
  arr.push(getMonth(end));
  return arr;
};

var getYearsBetween = function() {
  var start = new Date($('#d1').data('datepicker').date);
  var end = $('#d2').data('datepicker').date;

  if (start.getTime() > end.getTime()) {
    return [];
  }

  var endYear = end.getFullYear();
  var arr = [];
  while (!_.isEqual(start.getFullYear(), endYear)) {
    arr.push(start.getFullYear());
    start.setFullYear(start.getFullYear() + 1);
  }
  arr.push(endYear);
  return arr;
};

var getFiscalYear = function(d) {
  var y = d.getFullYear();
  var threshold = new Date('July 1 ' + y);
  return (d.getTime() >= threshold.getTime())?(y):(y-1);
};

var getFiscalYearsBetween = function() {
  var start = new Date($('#d1').data('datepicker').date);
  var end = $('#d2').data('datepicker').date;

  if (start.getTime() > end.getTime()) {
    return [];
  }

  var endFiscalYear = getFiscalYear(end);
  var arr = [];
  while (!_.isEqual(getFiscalYear(start), endFiscalYear)) {
    arr.push(getFiscalYear(start));
    start.setFullYear(start.getFullYear() + 1);
  }
  arr.push(endFiscalYear);
  return arr;
};

var getSemester = function(d) {
  var y = d.getFullYear();
  var summerThreshold = new Date('May 28 ' + y);
  if(d.getTime() < summerThreshold.getTime()) {
    return ['Spring', y];
  }
  var fallThreshold = new Date('August 25 ' + y);
  if(d.getTime() < fallThreshold.getTime()) {
    return ['Summer', y];
  } else {
    return ['Fall', y];
  }
};
var increaseSemester = function(d) {
  var y = d.getFullYear();
  var summerThreshold = new Date('May 28 ' + y);
  if(d.getTime() < summerThreshold.getTime()) {
    return summerThreshold;
  }
  var fallThreshold = new Date('August 25 ' + y);
  if(d.getTime() < fallThreshold.getTime()) {
    return fallThreshold;
  } else {
    return new Date('January 1 ' + (y+1));
  }
};

var getSemestersBetween = function() {
  var start = new Date($('#d1').data('datepicker').date);
  var end = $('#d2').data('datepicker').date;

  if (start.getTime() > end.getTime()) {
    return [];
  }

  var endSemester = getSemester(end);
  var arr = [];
  while (!_.isEqual(getSemester(start), endSemester)) {
    arr.push(getSemester(start));
    start = increaseSemester(start);
  }
  arr.push(endSemester);
  return arr;
};


var Event = Backbone.Model.extend({
  initialize: function() {
    this.set('reservedHour', (Date.parse(this.get('end'))-Date.parse(this.get('start')))/(60*60*1000));
    this.set('eventHour', (Date.parse(this.get('eventEnd'))-Date.parse(this.get('eventStart')))/(60*60*1000));
    this.set('shiftHour', this.get('shifts').reduce(function(prev, shift){return prev + ((Date.parse(shift.end)-Date.parse(shift.start))/(60*60*1000));}, 0));
    this.set('fullShiftNumber', fullShiftNumber(this.attributes));
  }
});

var PageableEventList = Backbone.PageableCollection.extend({
  model: Event,
  state: {
    pageSize: 10
  },
  updatePageSize: function() {
    this.state.pageSize = parseInt($('#pagination').val());
  },
  mode: "client",
  overview: function() {
    var events = this.fullCollection.toJSON();
    var data = {
      all: events.length,
      cancelled: _.where(events, {cancelled: true}).length,
      fullyStaffed: events.reduce(function(prev, event){return prev + ((fullShiftNumber(event) === event.staffNeeded)?1:0);}, 0),
      partiallyStaffed: events.reduce(function(prev, event){return prev + ((fullShiftNumber(event) < event.staffNeeded && fullShiftNumber(event) > 0)?1:0);}, 0),
      unstaffedEvents: events.reduce(function(prev, event){return prev + ((fullShiftNumber(event) === 0)?1:0);}, 0),
      totalHours: events.reduce(function(prev, event){return prev + ((Date.parse(event.end)-Date.parse(event.start))/(60*60*1000));}, 0).toFixed(2),
      totalShiftHours: events.reduce(function(p, c){ return p + c.shiftHour; }, 0).toFixed(2),
      getCategoryNumber: function(cat) {
        return _.where(events, {category: cat}).length;
      },
      techMustStay: _.where(events, {techMustStay: true}).length,
      video: _.where(events, {video: true}).length,
      audio: _.where(events, {audio: true}).length,
    };
    this.data = data;
    $('#overview').html(_.template($('#overview-template').html(), {events: events, data: data}));
  },
  graphs: function() {
    var graphType = $('#graph-type').val().split(' - ');
    if(graphType[0] === 'Events') {
      this.eventGraphs(graphType[1]);
    } else if(graphType[0] === 'Time') {
      this.timeGraphs(graphType[1], graphType[2]);
    } else {
      console.error('No such graph exists');
    }
    $('.loading').hide();
  },
  eventGraphs: function(graphType) {
    $('.graphs').html(_.template($('#event-graphs-template').html(), {}));

    var options = {
        inGraphDataShow: true,
        canvasBorders: true,
        canvasBordersWidth: 2,
        graphTitle: "Events by Category",
        graphTitleFontSize: 16,
        legend: true,
        rotateLabels: "smart",
        legendBordersSpaceBefore: 0,
        legendBordersSpaceAfter: 0,
        startAngle: 0,
        animationSteps : 20,
        animationEasing : "easeOutQuart",
        //animation: false
    };

    var self = this;
    
    var makeBarData = function() {
      if(graphType === 'Bar') {
        data = {
          labels: data.map(function(x){return x.title;}),
          datasets: [{data: data.map(function(x){return x.value;}), fillColor: randomColor()}],
        };
      }
    };
    

    var data = ['A', 'B', 'C'].map(function(cat) {
      return {
        value: self.data.getCategoryNumber(cat),
        title: cat,
        color: randomColor() 
      };
    }); 

    makeBarData();

    var chart1 = new Chart(document.getElementById("chart1").getContext("2d"))[graphType](data, options);
    options.graphTitle = "Events by Staffing";
    data = [{
      title: "Fully Staffed",
      value: self.data.fullyStaffed
    }, {
      title: "Partially Staffed",
      value: self.data.partiallyStaffed
    }, {
      title: "Unstaffed",
      value: self.data.unstaffedEvents
    }, {
      title: "Cancelled",
      value: self.data.cancelled
    }].map(function(x) {
      x.color = randomColor();
      return x;
    }); 
    makeBarData();

    var chart2 = new Chart(document.getElementById("chart2").getContext("2d"))[graphType](data, options);

    options.graphTitle = "Events by Staying";
    data = [{
      title: "Stay",
      value: self.data.techMustStay
    }, {
      title: "Setup and Breakdown",
      value: self.data.all - self.data.techMustStay
    }].map(function(x) {
      x.color = randomColor();
      return x;
    }); 
    makeBarData();

    var chart3 = new Chart(document.getElementById("chart3").getContext("2d"))[graphType](data, options);
  },
  timeGraphs: function(graphType, choice) {
    $('.graphs').html(_.template($('#time-graphs-template').html(), {}));

    var events = this.fullCollection.toJSON();

    var options = {
        bezierCurve: false,
        inGraphDataShow: true,
        canvasBorders: true,
        canvasBordersWidth: 2,
        graphTitleFontSize: 16,
        legend: true,
        rotateLabels: "smart",
        legendBordersSpaceBefore: 0,
        legendBordersSpaceAfter: 0,
        startAngle: 0,
        animationSteps: 20,
        animationEasing: "easeOutQuart",
        //animation: false
    };
    var days = getDaysBetween().map(function(x){return new Date(x);});
    var eventsAtDay = function(d) {
        return events.filter(function(event) {
            return (new Date(event.start)).toDateString() === d.toDateString();
        });
    };

    var weeks = getWeeksBetween();
    var eventsAtWeek = function(weekObj) {
      return events.filter(function(event) {
        return _.isEqual(weekObj, getWeek(new Date(event.start)));
      });
    };

    var months = getMonthsBetween();
    var eventsAtMonth = function(monthObj) {
      return events.filter(function(event) {
        return _.isEqual(monthObj, getMonth(new Date(event.start)));
      });
    };

    var years = getYearsBetween();
    var eventsAtYear = function(year) {
      return events.filter(function(event) {
        return _.isEqual(year, (new Date(event.start)).getFullYear());
      });
    };

    var fiscalYears = getFiscalYearsBetween();
    var eventsAtFiscalYear = function(fiscalYear) {
      return events.filter(function(event) {
        return _.isEqual(fiscalYear, getFiscalYear(new Date(event.start)));
      });
    };

    var semesters = getSemestersBetween();
    var eventsAtSemester = function(semester) {
      return events.filter(function(event) {
        return _.isEqual(semester, getSemester(new Date(event.start)));
      });
    };

    var graphTime = $('#graph-time').val();

    var time, eventsAtTime, labels;

    switch (graphTime) {
      case 'Days':
        time = days;
        eventsAtTime = eventsAtDay;
        labels = days.map(function(d) {return (d.getMonth() + 1) + '/' + d.getDate();});
        break;
      case 'Weeks':
        time = weeks;
        eventsAtTime = eventsAtWeek;
        labels = weeks.map(function(o) {return ordinal(o[0]) + ' week, ' + o[1];});
        break;
      case 'Months':
        time = months;
        eventsAtTime = eventsAtMonth;
        var n = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
        labels = months.map(function(o){return n[o[0]-1] + ' ' + o[1];}); 
        break;
      case 'Years':
        time = years;
        eventsAtTime = eventsAtYear;
        labels = years.map(String);
        break;
      case 'Fiscal Years':
        time = fiscalYears;
        eventsAtTime = eventsAtFiscalYear;
        labels = fiscalYears.map(String);
        break;
      case 'Semesters':
        time = semesters;
        eventsAtTime = eventsAtSemester;
        labels = semesters.map(function(o){return o.join(' ');});
        break;
    }

    var data;

    if(choice === 'Category') {

      options.graphTitle = "Events by Category";

      data = {
          labels: labels,
          datasets: ['A', 'B', 'C'].map(function(cat) {
              return {
                  title: cat,
                  data: time.map(function(d) {return _(eventsAtTime(d)).where({category:cat}).length;})
              };
          }).map(function(x) {
              x[(graphType === 'Line')?'strokeColor':'fillColor'] = randomColor();
              x[(graphType === 'Bar' || graphType === 'StackedBar')?'strokeColor':'fillColor'] = 'transparent';
              return x;
          })
      };
    } else if(choice === 'Staffing') {
      options.graphTitle = "Events by Staffing";

      data = {
        labels: labels,
        datasets: [{
          title: "Fully Staffed",
          data: time.map(function(d) {
            return eventsAtTime(d).reduce(function(prev, event) {
              return prev + ((fullShiftNumber(event) === event.staffNeeded) ? 1 : 0);
            }, 0);
          })
        }, {
          title: "Partially Staffed",
          data: time.map(function(d) {
            return eventsAtTime(d).reduce(function(prev, event) {
              return prev + ((fullShiftNumber(event) < event.staffNeeded && fullShiftNumber(event) > 0) ? 1 : 0);
            }, 0);
          })
        }, {
          title: "Unstaffed",
          data: time.map(function(d) {
            return eventsAtTime(d).reduce(function(prev, event) {
              return prev + ((fullShiftNumber(event) === 0) ? 1 : 0);
            }, 0);
          })
        }, {
          title: "Cancelled",
          data: time.map(function(d) {
            return _.where(eventsAtTime(d), {
              cancelled: true
            }).length;
          })
        }].map(function(x) {
          x[(graphType === 'Line') ? 'strokeColor' : 'fillColor'] = randomColor();
          x[(graphType === 'Bar' || graphType === 'StackedBar')?'strokeColor':'fillColor'] = 'transparent';
          return x;
        })
      };


    } else {
      console.error('No such graph choice exists');
    }

    var chart = new Chart(document.getElementById("chart").getContext("2d"))[graphType](data, options);

  }
});


var InventoryCell = Backgrid.Cell.extend({
    render: function() {
      this.$el.html(this.model.get('inventory').reduce(function(prev, current) {return prev + parseInt(current.amt);}, 0));
      return this;
    }
});

var columns = [{
  name: "",
  cell: "select-row",
  headerCell: "select-all",
  renderable: true
}, {
  name: "title",
  label: "Title",
  cell: "string",
  editable: false
}, {
  name: "category",
  label: "Category",
  cell: "string",
  editable: false
}, {
  name: "loc",
  label: "Location",
  cell: "string",
  editable: false
}, {
  name: "start",
        
  label: "Date",
  cell: "date",
  editable: false
}, {
  name: "fullShiftNumber",
  label: "St. Assigned",
  cell: 'integer',
  editable: false
}, {
  name: "staffNeeded",
  label: "St. Needed",
  cell: "integer",
  editable: false
}, {
  name: "reservedHour",
  label: "Reserved hr",
  cell: 'number',
  editable: false
}, {
  name: "eventHour",
  label: "Event hr",
  cell: 'number',
  editable: false
}, {
  name: "shiftHour",
  label: "Shift hr",
  cell: 'number',
  editable: false
}, {
  name: "inventory",
  label: "Inventory",
  cell: InventoryCell,
  editable: false
}, {
  name: "cancelled",
  label: "Cancelled",
  cell: "boolean",
  editable: false
}, {
  name: "techMustStay",
  label: "Tech Stay",
  cell: "boolean",
  editable: false
}, {
  name: "video",
  label: "Video",
  cell: "boolean",
  editable: false
}, {
  name: "audio",
  label: "Audio",
  cell: "boolean",
  editable: false
}];



$(document).ready(function() {
    var today = new Date();
    today.setHours(0,0,0,0);
    var lastWeek = new Date(today.getTime() - 24 * 60 * 60 * 1000 * 7);

    $('.date').datepicker();
    $('#d1').datepicker('setValue', lastWeek);
    $('#d2').datepicker('setValue', today);

    pageableEventList = new PageableEventList();
    
    var refreshEvents = function() {
      $('.loading').show();
      pageableEventList.url = '/events?filter=' + $('#filter').val() + 
                              '&start=' + ($('#d1').data('datepicker').date.getTime() / 1000) + 
                              '&end='   + ($('#d2').data('datepicker').date.getTime() / 1000);
      pageableEventList.fetch({
        reset: true,
        success: function() {
          pageableEventList.overview();
          pageableEventList.graphs();
          if(typeof done === 'undefined') {
            done=true;
            $( "a:contains('Date')" ).trigger('click').trigger('click');
          }
        }
      });
    };

    $('#filter').change(refreshEvents);
    $('.date').on('changeDate', refreshEvents);
    $('#graph-type').change(function(){
        $('.loading').show({done: function(){
          pageableEventList.graphs();
        }});
    });
    $('#graph-time').change(function(){
        $('.loading').show({done: function(){
          pageableEventList.graphs();
        }});
    });
    $('#pagination').change(function(){pageableEventList.updatePageSize();refreshEvents();});
    var paginator = new Backgrid.Extension.Paginator({
      collection: pageableEventList
    });

    var pageableGrid = new Backgrid.Grid({
      columns: columns,
      collection: pageableEventList
    });

    $stuff = $(".stuff");
    $stuff.append(pageableGrid.render().el);
    $stuff.after(paginator.render().el);

    var filter = new Backgrid.Extension.ClientSideFilter({
      collection: pageableEventList,
      fields: ['title', 'loc']
    });

    //$stuff.before(filter.render().el);
    $('.buttons').after(filter.render().el);
    $(filter.el).css({
      float: "right",
      margin: "20px"
    });
    
    refreshEvents();
});
$(document).keydown(function(e) {
    if (!$(event.target).is(':not(input, textarea)')) { return; } //don't do anything if on input/textarea
    switch (e.keyCode) {
    case 39: // pressed "right" arrow
            $('.backgrid-paginator a[title="Next"]').trigger('click');
            break;
    case 37: // pressed "left" arrow
            $('.backgrid-paginator a[title="Previous"]').trigger('click');
            break;
    }
});
