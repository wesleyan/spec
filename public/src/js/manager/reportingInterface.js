var Event = Backbone.Model.extend({
  initialize: function() {}
});

var PageableEventList = Backbone.PageableCollection.extend({
  model: Event,
  state: {
    pageSize: 10
  },
  mode: "client",
  overview: function() {
    $('#overview').html(_.template($('#overview-template').html(), {events: this.fullCollection.toJSON()}));
  }
});

var fullShiftNumber = function(event) {
  return event.shifts.map(function(s){return s.staff;}).filter(function(n){return n;}).length;
};

var StaffNumberCell = Backgrid.Cell.extend({
    render: function() {
      this.$el.html(fullShiftNumber(this.model.attributes));
      return this;
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
  name: "shifts",
  label: "Staff Assigned",
  cell: StaffNumberCell,
  editable: false
}, {
  name: "staffNeeded",
  label: "Staff Needed",
  cell: "string",
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
          if(typeof done === 'undefined') {
            done=true;
            $( "a:contains('Date')" ).trigger('click').trigger('click');
          }
        }
      });
    };

    $('#filter').change(refreshEvents);
    $('.date').on('changeDate', refreshEvents);

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
