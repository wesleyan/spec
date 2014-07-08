var Inventory = Backbone.Model.extend({
  urlRoot: 'inventory/db',
  initialize: function() {
    this.on('change', function(inventory) {
      console.log(inventory.changed);
      $.ajax({
        type: "PATCH",
        url: pageableInventoryList.url + '/' + inventory.get('_id'),
        data: inventory.changed,
      }).done(function(msg) {
        pageableInventoryList.fetch({
          reset: true
        });
      });
    });
  }
});

var PageableInventoryList = Backbone.PageableCollection.extend({
  model: Inventory,
  url: "/inventory/db",
  state: {
    pageSize: 20
  },
  mode: "client"
});

var pageableInventoryList = new PageableInventoryList();

pageableInventoryList.comparator = "name";
pageableInventoryList.sort();

var columns = [{
  name: "",
  cell: "select-row",
  headerCell: "select-all",
  renderable: true
}, {
  name: "id",
  label: "Id",
  cell: 'integer',
  editable: false
}, {
  name: "text",
  label: "Name",
  cell: "string",
  direction: "ascending"
}, {
  name: "price",
  label: "Hourly Price ($)",
  cell: 'integer'
}];
var pageableGrid = new Backgrid.Grid({
  columns: columns,
  collection: pageableInventoryList
});

$stuff = $(".stuff");
$stuff.append(pageableGrid.render().el);

var paginator = new Backgrid.Extension.Paginator({
  collection: pageableInventoryList
});

$stuff.after(paginator.render().el);

var filter = new Backgrid.Extension.ClientSideFilter({
  collection: pageableInventoryList,
  fields: ['text']
});

$stuff.before(filter.render().el);
$(filter.el).css({
  float: "right",
  margin: "20px"
});

pageableInventoryList.fetch({
  reset: true
});

//INVENTORY ADDING
$.fn.editable.defaults.mode = 'inline';

$('#newInventory').click(function() {
  $('#newModal .modal-body').html(_.template($('#newTemplate').html()));

  //init editables


  $('.x-add').editable({});

  //make username required
  $('#name').editable('option', 'validate', function(v) {
    if (!v) return 'Required field!';
  });
  $('#price').editable('option', 'validate', function(v) {
    if (!v) return 'Required field!';

    var regex = /^[0-9]+$/;
    if(!regex.test(v)) {
        return 'Numbers only!';
    }
  });

  //automatically show next editable
  $('.x-add').on('save', function() {
    var that = this;
    setTimeout(function() {
      $(that).closest('tr').next().find('.x-add').editable('show');
    }, 200);
  });

  $('#newModal').modal('show');
});

$('#newModal .btn-primary').click(function() {
  var name = $('#name').editable('getValue', true);
  var price = parseInt($('#price').editable('getValue', true));

  if(name === '' || isNaN(price)) {
    var msg = 'Name has to be filled and the price has to be a valid number.';
    $('#msg').removeClass('alert-success').addClass('alert-error').html(msg).show();
    return;
  }
  var obj = {text: name, price: price};
  console.log(obj);
  $.ajax({
    type: "POST",
    url: pageableInventoryList.url,
    data: obj,
  }).done(function(msg) {
    pageableInventoryList.fetch({
      reset: true
    });
  });
});

//INVENTORY DELETING
$('#deleteInventory').click(function() {
  var models = pageableGrid.getSelectedModels();
  idsToDelete = [];
  models.forEach(function(model) {
    idsToDelete.push(model.get('_id'));
  });
  $('#deleteModal ul').html(_.template($('#deleteTemplate').html(), {
    'models': models
  }));
  $('#deleteModal').modal('show');
});

$('#deleteModal .btn-danger').click(function() {
  // //send requests to the server
  idsToDelete.forEach(function(idToDelete) {
    $.ajax({
      type: "DELETE",
      url: pageableInventoryList.url + "/" + idToDelete
    }).done(function(msg) {
      //one id deleted
      pageableInventoryList.remove(pageableGrid.getSelectedModels());
    });
  });
  $('#deleteModal').modal('hide');
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

