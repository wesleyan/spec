var fullShiftNumber = function(event) {
  return event.shifts.map(function(s){return s.staff;}).filter(function(n){return n;}).length;
};

var randomColor = function() {
  return '#'+Math.floor(Math.random()*16777215).toString(16);
};

var Event = Backbone.Model.extend({
  initialize: function() {
    this.set('shiftHour', this.get('shifts').reduce(function(prev, shift){return prev + ((Date.parse(shift.end)-Date.parse(shift.start))/(60*60*1000));}, 0));
    this.set('fullShiftNumber', fullShiftNumber(this.attributes));
  }
});

var PageableEventList = Backbone.PageableCollection.extend({
  model: Event,
  state: {
    pageSize: 10
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
    var graphType = $('#graph-type').val();
    $('.graphs').html(_.template($('#graphs-template').html(), {}));

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
  label: "Staff Assigned",
  cell: 'integer',
  editable: false
}, {
  name: "staffNeeded",
  label: "Staff Needed",
  cell: "integer",
  editable: false
}, {
  name: "shiftHour",
  label: "Shift Hour",
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
  label: "Tech Must Stay",
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
    $('#graph-type').change(function(){pageableEventList.graphs();});
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
