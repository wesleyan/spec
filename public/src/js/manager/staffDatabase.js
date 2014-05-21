var splitTrim = function(str) {
  return str.split(',').map(function(x) {
    return x.trim();
  });
};

var Staff = Backbone.Model.extend({
  initialize: function() {
    this.on('change', function(staff) {
      var changed = staff.changed;
      if (Object.keys(staff.changed)[0] === "task") { //check if arrays are the same
        var prev = staff.previousAttributes();
        var newTasks = splitTrim(staff.get(Object.keys(staff.changed)[0]));
        var oldTasks;
        try {
          oldTasks = prev[Object.keys(staff.changed)[0]];
          if (!_.isArray(oldTasks)) {
            oldTasks = splitTrim(oldTasks);
          }
        } catch (e) {}
        if (_.isEqual(oldTasks, newTasks)) {
          return false; //there is no changes
        }
        changed = {
          "task": newTasks
        };
      }
      console.log("changed: " + staff.get('name') + " -> " + JSON.stringify(changed));
      //some stuff to update the database
      //console.log(staff);
      //staff.get('_id')
      $.ajax({
        type: "POST",
        url: "/staff/db/update",
        data: {
          'id': staff.get('_id'),
          'what': changed
        }
      }).done(function(msg) {
        //changed
        //pageableStaffList.fetch({reset:true})
      });

    });
  }
});

var PageableStaffList = Backbone.PageableCollection.extend({
  model: Staff,
  url: "/staff/all",
  state: {
    pageSize: 20
  },
  mode: "client"
});

var pageableStaffList = new PageableStaffList();

pageableStaffList.comparator = "name";
pageableStaffList.sort();

var plainInteger = Backgrid.IntegerCell.extend({
  orderSeparator: ''
});

var strikeCell = Backgrid.Cell.extend({
    template: _.template("<%=strikes.length%>"),
    events: {
      "click": "deleteRow"
    },
    deleteRow: function (e) {
      e.preventDefault();
      alert(JSON.stringify(this.model.get('strikes')));
    },
    render: function () {
      this.$el.html(this.template({strikes:this.model.get('strikes')}));
      this.delegateEvents();
      return this;
    }
});

var columns = [{
  name: "",
  cell: "select-row",
  headerCell: "select-all",
  renderable: true
}, {
  name: "name",
  label: "Name",
  cell: "string",
  direction: "ascending"
}, {
  name: "username",
  label: "User Name",
  cell: "string"
}, {
  name: "class_year",
  label: "Class Year",
  cell: plainInteger
}, {
  name: "phone",
  label: "Phone Number",
  cell: plainInteger
}, {
  name: "level",
  label: "Permission Level",
  cell: "integer"
}, {
  name: "task",
  label: "Task",
  cell: "string",
}, {
  name: "professional",
  label: "Professional",
  cell: "boolean",
}, {
  name: "trainee",
  label: "Trainee",
  cell: "boolean",
},{
  name: "strikes",
  label: "Strikes",
  cell: strikeCell
}];
var pageableGrid = new Backgrid.Grid({
  columns: columns,
  collection: pageableStaffList
});

$stuff = $(".stuff");
$stuff.append(pageableGrid.render().el);

var paginator = new Backgrid.Extension.Paginator({
  collection: pageableStaffList
});

$stuff.after(paginator.render().el);

var filter = new Backgrid.Extension.ClientSideFilter({
  collection: pageableStaffList,
  fields: ['name']
});

$stuff.before(filter.render().el);
$(filter.el).css({
  float: "right",
  margin: "20px"
});

pageableStaffList.fetch({
  reset: true
});

//STAFF ADDING
$.fn.editable.defaults.mode = 'inline';

$('#newStaff').click(function() {
  $('#newModal .modal-body').html(_.template($('#newTemplate').html()));

  //init editables 


  $('#professional').editable({
    value: 0,
    source: [{
      value: 1,
      text: 'Yes'
    }, {
      value: 0,
      text: 'No'
    }, ]
  });
  $('#trainee').editable({
    value: 1,
    source: [{
      value: 1,
      text: 'Yes'
    }, {
      value: 0,
      text: 'No'
    }, ]
  });
  $('.x-add').editable({});

  //make username required
  $('#name').editable('option', 'validate', function(v) {
    if (!v) return 'Required field!';
  });
  $('#username').editable('option', 'validate', function(v) {
    if (!v) return 'Required field!';
  });
  $('#class_year').editable('option', 'validate', function(v) {
    if (!v) return 'Required field!';
    if (!(/\d{4}/.test(v)) || isNaN(new Date(v, 0, 1)) || parseInt(v) < (new Date()).getFullYear()) {
      return 'Enter a valid year for this please!';
    }
  });
  $('#phone').editable('option', 'validate', function(v) {
    if (!v) return 'Required field!';
    if (!(/^[0-9\-\+]{9,15}$/.test(v))) {
      return 'Enter a valid phone number please!';
    }
  });
  $('#level').editable('option', 'validate', function(v) {
    if (!v) return 'Required field!';
    if (!((/\d{1}/.test(v)) || (/\d{2}/.test(v))) || parseInt(v) > 10 || parseInt(v) < 0) {
      return 'Enter a valid permission level please!';
    }
  });

  $('#task').editable('option', 'validate', function(v) {
    if (!v) return 'Required field!';
    try {
      v = splitTrim(v);
    } catch (e) {
      return 'Please enter a valid list of tasks.';
    }
  });

  //automatically show next editable
  $('.x-add').on('save.newuser', function() {
    var that = this;
    setTimeout(function() {
      $(that).closest('tr').next().find('.x-add').editable('show');
    }, 200);
  });

  $('#newModal').modal('show');
});

$('#newModal .btn-primary').click(function() {
  $('.x-add').editable('submit', {
    url: '/staff/db/add',
    ajaxOptions: {
      dataType: 'json'
    },
    success: function(data, config) {
      if (data && data.errors) {
        //server-side validation error, response like {"errors": {"username": "username already exist"} }
        config.error.call(this, data.errors);
      } else if (data) {
        pageableStaffList.fetch({
          reset: true
        });
        //show messages
        var msg = 'New user created! Now editables submit individually.';
        $('#msg').addClass('alert-success').removeClass('alert-error').html(msg).show();
        //$('#save-btn').hide();
        $('#newModal').modal('hide');
      }
    },
    error: function(errors) {
      var msg = '';
      if (errors && errors.responseText) { //ajax error, errors = xhr object
        msg = errors.responseText;
      } else { //validation error (client-side or server-side)
        $.each(errors, function(k, v) {
          msg += k + ": " + v + "<br>";
        });
      }
      $('#msg').removeClass('alert-success').addClass('alert-error').html(msg).show();
    }
  });
});

//STAFF DELETING
$('#deleteStaff').click(function() {
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
  //send requests to the server
  idsToDelete.forEach(function(idToDelete) {
    $.ajax({
      type: "POST",
      url: "/staff/db/delete",
      data: {
        'id': idToDelete
      }
    }).done(function(msg) {
      //one id deleted
      pageableStaffList.fetch({
        reset: true
      });
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

