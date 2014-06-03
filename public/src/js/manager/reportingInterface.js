var Event = Backbone.Model.extend({
  initialize: function() {}
});

var PageableEventList = Backbone.PageableCollection.extend({
  model: Event,
  url: "/events?start=1388034000&end=1391662800",
  state: {
    pageSize: 20
  },
  mode: "client"
});

var pageableEventList = new PageableEventList();

pageableEventList.comparator = "title";
pageableEventList.sort();

var columns = [{
  name: "",
  cell: "select-row",
  headerCell: "select-all",
  renderable: true
}, {
  name: "title",
  label: "Title",
  cell: "string",
  direction: "ascending",
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
}];
var pageableGrid = new Backgrid.Grid({
  columns: columns,
  collection: pageableEventList
});

$stuff = $(".stuff");
$stuff.append(pageableGrid.render().el);

var paginator = new Backgrid.Extension.Paginator({
  collection: pageableEventList
});

$stuff.after(paginator.render().el);

var filter = new Backgrid.Extension.ClientSideFilter({
  collection: pageableEventList,
  fields: ['name']
});

$stuff.before(filter.render().el);
$(filter.el).css({
  float: "right",
  margin: "20px"
});

pageableEventList.fetch({
  reset: true
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