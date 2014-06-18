jQuery(function($){
  $.fn.editable.defaults.mode = 'inline';
  var Spec = {};

  // starting: utility functions

  var fullShiftNumber = function(event) {
    return event.shifts.map(function(s){return s.staff;}).filter(function(n){return n;}).length;
  };

  var getIcons = function(event, white) {
    if(_.isUndefined(white)) {
      white = false;
    }
    symbol = '';
    if (event.onHold === true) {
      symbol += '<i class="icon-ban-circle"></i> ';
    }
    if (event.video === true) {
      symbol += '<i class="icon-facetime-video"></i> ';
    }
    if (event.audio === true) {
      symbol += '<i class="icon-volume-up"></i> ';
    }  
    symbol = $($.parseHTML(symbol));
    symbol.siblings('i').addClass(white ? 'icon-white' : '');
    return symbol;
  };

  var hideModalPopover = function() {
    $('#popup').modalPopover('hide');
    $('#eventButton').addClass('disabled');
  };

  var setTimeline = function() {
      $('.timeline').remove();
      var parentDiv = $(".fc-agenda-slots:visible").parent();
      var timeline = $("<hr>").addClass("timeline");
      parentDiv.prepend(timeline);
      var curTime = new Date();
      var curCalView = $("#calendar").fullCalendar('getView');
      if (curCalView.intervalStart.toDate() < curTime && curCalView.intervalEnd.toDate() > curTime) {
          timeline.show();
      } else {
          timeline.hide();
          return;
      }
      var curSeconds = (curTime.getHours() * 60 * 60) + (curTime.getMinutes() * 60) + curTime.getSeconds();
      var percentOfDay = curSeconds / 86400; //24 * 60 * 60 = 86400, # of seconds in a day
      var topLoc = Math.floor(parentDiv.height() * percentOfDay);
      timeline.css("top", topLoc + "px");
      if (curCalView.name === "agendaWeek") { //week view, don't want the timeline to go the whole way across
          var dayCol = $(".fc-today:visible");
          var left = dayCol.position().left + 1;
          var width = dayCol.width() - 2;
          timeline.css({
              left: left + "px",
              width: width + "px"
          });
      }
  };

  //end of utility functions
  
  var Event = Backbone.Model.extend({
    idAttribute: '_id',
    initialize: function() {
      this.on({
        'change': this.updateClientEvent
      });
    },
    fcEvent: function() {
      var e = _.first(eventsView.$el.fullCalendar('clientEvents', this.get('_id')));
      if(_.isUndefined(e)) {
        console.log(this);
        throw new Error("No such FullCalendar event");
      } else {
        return e;
      }
    },
    updateClientEvent: function(model) {
      if(_.isUndefined(model)) {
        return false;
      }
      fcEvent = _.extend(model.fcEvent(), model.changed);
      eventsView.$el.fullCalendar('updateEvent', fcEvent);
      model.save(model.changed, {patch: true});
    }
  });

  var Events = Backbone.Collection.extend({
    initialize: function(options) {
      this.filter = options.filter;
      if(this.filter === '') {
        this.filter = 'hideCancelled';
      }
    },
    model: Event,
    url: '/events',
    getNewEvents: function(start, end, cb) {
      this.fetch({
        data: {
          start:  start.unix(),
          end:    end.unix(),
          filter: this.filter
        },
        success: function(collection, response, options) {
          cb(response);
        }
      });
    }
  });

  var EventsView = Backbone.View.extend({
    initialize: function(){
      this.render();
    },
    render: function() {
      var self = this;

      $('#popup').modalPopover({
          target: '#eventButton',
          placement: 'bottom',
          backdrop: false
      });

      this.$el.fullCalendar({
        header: {
          left: 'prev,next today',
          center: 'title',
          right: 'month,agendaWeek,agendaDay'
        },
        timezone: 'local',
        lazyFetching: true,
        allDaySlot: false,
        defaultView: 'agendaWeek',
        windowResize: function(view) {
          self.adjustSize();
        },
        viewRender: setTimeline,
        events: function(start, end, timezone, cb) {
          self.collection.getNewEvents(start, end, cb);
        },
        eventRender: function(event, el, view) {
          if(!_.isUndefined(event.gCal) && event.gCal === true) {
            return;
          }

          new EventView({
            model: self.collection.findWhere({_id: event._id}),
            event: event,
            el:    el,
            view:  view
          });
        }
      });
      
      this.adjustSize();
      
      $('#leftGroup').detach().prependTo('.fc-header-left');
      $('#rightGroup').detach().appendTo('.fc-header-right');
      
      //Assign keyboard shortcuts
      $(document).keydown(function(e) {
        if (!$(event.target).is(':not(input, textarea)')) { return; } //don't do anything if on input/textarea
        switch (e.keyCode) {
          case 39: // pressed "right" arrow
            hideModalPopover();    
            self.$el.fullCalendar('next');
            break;
          case 37: // pressed "left" arrow
            hideModalPopover();    
            self.$el.fullCalendar('prev');
            break;
          case 38: // pressed "up" arrow
            hideModalPopover();    
            self.$el.fullCalendar('today');
            break;
        }
      });
      
      setInterval(setTimeline(), 1000*60*5);

      return this;
    },
    adjustSize: function() {
      var height = $(window).height() - $('.fc-header').height() / 2;
      this.$el.fullCalendar('option', 'height', height);
      $('#modifyCSSRule').html('.fc-view-month { height:' + (height - 70) + 'px !important;  }');
    },
    events: {
      'click .fc-widget-content': 'onEmptyAreaClick',
    },
    onEmptyAreaClick: function(e) {
      hideModalPopover();
    }
  });

  var EventView = Backbone.View.extend({
    initialize: function() {
      this.event = this.model.attributes;
      this.render();     
    },
    //Event Render Functions
    render: function() {
      this.addBackgroundClasses();
      this.backBoxes();
      this.$el.find('.fc-event-title').prepend(getIcons(this.event, true));
      this.staffTooltip();
      this.$el.contextmenu({'target': '#context-menu'});
      return this;
    },
    addBackgroundClasses: function() {
      var shiftNumber = fullShiftNumber(this.event);

      if (this.event.techMustStay === false) {
          this.$el.addClass('setupAndBreakdown'); //handles the setup and breakdown events as well
      }
      if (this.event.cancelled === true) {
          this.$el.addClass('fc-cancelled');
      } else if (shiftNumber === 0) {
          this.$el.addClass('fc-unstaffed');
      } else if (shiftNumber < this.event.staffNeeded) {
          this.$el.addClass('fc-partially');
      } else if (shiftNumber === this.event.staffNeeded) {
          this.$el.addClass('fc-staffed');
      }

      // add a class if the event any unconfirmed shifts
      var hasUnconfirmedShift = false;
      this.event.shifts.forEach(function(shift) {
          if(!_(shift.confirmed).isUndefined() && !shift.confirmed) {
              hasUnconfirmedShift = true;
          }
      });
      if(hasUnconfirmedShift) {
          this.$el.addClass('unconfirmed');
      }
    },
    backBoxes: function() { //adds darker boxes for setup and breakdown times
      var start = Date.parse(this.event.start);
      var end = Date.parse(this.event.end);
      var topPercentage = 0, bottomPercentage = 0;
      if(typeof this.event.eventStart !== 'undefined' && typeof this.event.eventEnd !== 'undefined') {
        var eventStart = Date.parse(this.event.eventStart);
        var eventEnd = Date.parse(this.event.eventEnd);
        topPercentage = ((start - eventStart) / (start - end)) * 100;
        bottomPercentage = ((eventEnd - end) / (start - end)) * 100;
      }
      this.$el.find('.fc-event-bg')
        .append("<div class='event-bg-section' style='height:" + topPercentage + "%'></div>")
        .append("<div style='height:" + (100-topPercentage-bottomPercentage) + "%'></div>")
        .append("<div class='event-bg-section' style='height:" + bottomPercentage + "%'></div></div>");
    },
    staffTooltip: function() {
      var shiftList = this.event.shifts.map(function(s) {
        var suffix = '';
        if(!_(s.confirmed).isUndefined() && !s.confirmed) {
          suffix = '(?)';
        }
        return s.staff + suffix;
      }).filter(function(n) {
        return n;
      });
      if (shiftList.length > 0) {
        this.$el.tooltip({
          'title': 'Staff: ' + shiftList.join(', ')
        });
      }
    },
    //JavaScript event delegations and handler functions for EventView
    events: {
      'click': 'onClick',
      'contextmenu': 'onRightClick'
    },
    onClick: function() {
      //start modal popover
      new ModalPopoverView({
        model: this.model,
        el: $('#popup')
      });
    },
    onRightClick: function() {
      this.onClick();
      if(Spec.permission < 10) {
        return false;
      }
      new ContextMenuView({
        model: this.model,
        el: $('#context-menu')
      });
    }
  });

  var collapse = [false, false]; //to keep collapsibles the same in each view recall
  var ModalPopoverView = Backbone.View.extend({
    initialize: function() {
      var self = this;
      this.model.on('change', function() {
        self.renderContent();
      });
      this.render(); 
    },
    render: function() {
      hideModalPopover();
      this.renderContent(); 
      this.$el.modalPopover('show');
      $('#eventButton').removeClass('disabled');
    },
    renderContent: function() {
      var self = this;

      this.$el.undelegate();
      var icons = getIcons(this.model.attributes).clone().wrap('<p>').parent().html();
      var template = _.template($("#modal-popover-template").html(), {
        event: this.model.attributes,
        staffColor: this.staffColor(),
        shiftNumber: fullShiftNumber(this.model.attributes),
        icons: icons,
        collapse: collapse,
        Spec: Spec
      });
      this.$el.html(template);
      var inv = this.model.attributes.inventory.map(function(item) {
        var id = parseInt(item.item);
        return {
          amt: parseInt(item.amt),
          id: id.toString(),
          text: inventoryList.getText(id)
        };
      });

      this.$el.find('#inventory').tags({
        values: inv,
        only_suggestions: true,
        suggestions: inventoryList.toJSON(),
        onRemove: function(pill) {
          var id = parseInt(pill.data('tag-id'));
          var setTo = self.model.get('inventory').filter(function(item) {
            return id !== item.id;
          });
          self.model.set('inventory'. setTo);
        },
        onDuplicate: function(original, duplicate) {
          var setTo = self.model.get('inventory').map(function(item) {
            if(parseInt(item.item) === parseInt(duplicate.id)) {
              item.amt++;
            }
            return item;
          });

          self.model.set('inventory', setTo);
          self.model.save({inventory: setTo}, {patch: true});
          self.model.trigger('change', self.model);
        },
        onBeforeAdd: function(pill, item) {
          if (!item.amt) {
            item.amt = 1;
          }
          pill = $(pill);
          pill.contents().first().before(
            '<input class="tag-amt" type="number" value="' +
            item.amt + '" min="1">');
          pill.find('input').change(function () {
            var amt = parseInt($(this).val());
            var setTo = self.model.get('inventory').map(function(x) {
              if(parseInt(x.item) === parseInt(item.id)) {
                x.amt = amt;
              }
              return x;
            });

            self.model.set('inventory', setTo);
            self.model.save({inventory: setTo}, {patch: true});
            self.model.trigger('change', self.model);
          });
          return pill; //has to return pill
        },
        onBeforeNewAdd: function(pill, item) {
          var toAdd = {
            amt: 1,
            item: item.id.toString()
          };
          
          self.model.set('inventory', self.model.get('inventory').concat(toAdd));
        }
      });

      // Solves Bootstrap typeahead dropdown overflow problem
      $('#collapseTwo').on('click shown keydown', function() {
        $(this).css('overflow', 'visible');
      }).on('hide', function() {
        $(this).css('overflow', 'hidden');
      });
    },
    staffColor: function() {
      var event = this.model.attributes;
      var shiftNumber = fullShiftNumber(event);
      if (event.cancelled === true) {
        return "btn-inverse";
      } else if (shiftNumber === 0) {
        return "btn-danger";
      } else if (shiftNumber < event.staffNeeded) {
        return "btn-warning";
      } else if (shiftNumber === event.staffNeeded) {
        return "btn-success";
      } else if (shiftNumber > event.staffNeeded) {
        return "btn-info";
      }
      return "";
    },
    events: {
      'click a[data-task="staff"]':        'staffEvent',
      'click button[data-task="addNote"]': 'addNote',
      'click .removeNote':                 'removeNote',
      'click a[href="#collapseOne"]':      'notesCollapse',
      'click a[href="#collapseTwo"]':      'inventoryCollapse'
    },
    notesCollapse: function() {
      collapse[0] = !collapse[0];
    },
    inventoryCollapse: function() {
      collapse[1] = !collapse[1];
    },
    staffEvent: function() {
      new StaffModalView({
        model: this.model,
        el:    $('#staff-modal')
      });
    },
    addNote: function(e) {
      new AddNoteView({
        model: this.model,
        el:    $('#add-note-modal')
      });
      return false;
    },
    removeNote: function(e) {
      var noteId = $(e.currentTarget).data('id');
      var notes = this.model.get('notes').filter(function(note) {
        return note.id !== noteId;
      });
      this.model.set('notes', notes);
    }
  });

  var AddNoteView = Backbone.View.extend({
    initialize: function(options) {
      this.render();
    },
    render: function() {
      var template = _.template($("#add-note-template").html(), {});
      this.$el.html(template);
      this.$el.modal('show');
      return this;
    },
    events: {
      'click .btn-primary': 'add',
      'hide':               'onClose'
    },
    add: function() {
      var text = this.$el.find('textarea').val();
      var note = {
        text: text,
        date: new Date(),
        user: Spec.username
      };
      this.model.set('notes', this.model.get('notes').concat(note));
      this.$el.modal('hide');
    },
    onClose: function() {
      this.undelegateEvents();
    }
  });

  var ContextMenuView = Backbone.View.extend({
    initialize: function() {
      //undelegate events from previous ContextMenuView instances
      this.$el.undelegate(); 

      this.render();     
    },
    render: function() {
      this.$el.find('ul').html(_.template($('#context-menu-template').html(), {event: this.model.attributes}));
    },
    events: {
      'click a[data-task="staff"]':    'staffEvent',
      'click a[data-task="duration"]': 'toggleDuration',
      'click a[data-task="video"]':    'toggleVideo',
      'click a[data-task="audio"]':    'toggleAudio',
      'click a[data-task="edit"]':     'editEvent',
      'click a[data-task="cancel"]':   'toggleCancel',
      'click a[data-task="remove"]':   'removeEvent'
    },
    staffEvent: function() {
      new StaffModalView({
        model: this.model,
        el:    $('#staff-modal')
      });
    },
    toggleDuration: function() {
      this.model.set('techMustStay', !this.model.get('techMustStay'));
    },
    toggleVideo: function() {
      this.model.set('video', !this.model.get('video'));
    },
    toggleAudio: function() {
      this.model.set('audio', !this.model.get('audio'));
    },
    editEvent: function() {
      new EditView({
        model: this.model,
        el: $('#edit-modal')
      });
    },
    toggleCancel: function() {
      this.model.set('cancelled', !this.model.get('cancelled'));
    },
    removeEvent: function() {
      new RemoveView({
        model: this.model,
        el: $('#remove-modal')
      });
    }
  });

  var RemoveView = Backbone.View.extend({
    initialize: function() {
      this.render();
    },
    render: function() {
      var template = _.template($("#remove-template").html(), {
        event: this.model.attributes
      });
      this.$el.html(template);
      this.$el.modal('show');
    },
    events: {
      'click .btn-danger': 'remove',
      'hide':              'close'
    },
    remove: function() {
      eventsView.$el.fullCalendar('removeEvents', this.model.get('_id'));
      this.model.destroy();
      this.close();
    },
    close: function() {
      this.$el.undelegate(); 
    }
  });

  var StaffModalView = Backbone.View.extend({
    initialize: function(options) {
      var self = this;
      this.render();
      this.staffView = new StaffView(options);
      this.model.on('change:shifts', function() {
        console.log('changed');
        self.staffView.clean();
        self.staffView = new StaffView(options);
      });
    },
    render: function() {
      this.$el.modal('show');
      return this;
    },
    events: {
      'hide': 'onClose'
    },
    onClose: function(e) {
      if(!$(e.target).is(e.currentTarget)) {
        //do not close if tooltip is hidden
        return;
      }
      this.staffView.clean();
      this.undelegateEvents();
    }
  });
  var StaffView = Backbone.View.extend({
    clean: function(e) {
      this.remove();
    },
    initialize: function(options) {
      var self = this;
      this.options = options;
      this.render();
    },
    render: function() {
      this.$el.find('.modal-body').html($('<div/>', {id: 'staff-el'}));
      this.$el = this.$el.find('#staff-el');
      this.renderModalContent();
      return this;
    },
    renderModalContent: function() {
      var event = this.model.fcEvent();
      event.shifts = this.model.get('shifts');
      //has is true if all shifts have an id
      var has = event.shifts.reduce(function(p, c) {return p && _.has(c, 'id');}, true);
      if(!has) {
        return;
      }

      var self = this;
      var template = _.template($("#staff-template").html(), {
        event: event
      });
      this.$el.html(template);
      this.$el.find('.spinner').spinner();
      this.$el.find('.coverShift').tooltip({
        title: 'Sent a tech from the office', 
        placement: 'left'
      });

      this.$el.find('#shift-start').timepicker({
        defaultTime: this.model.fcEvent().start.format('h:mm A')
      });
      this.$el.find('#shift-end').timepicker({
        defaultTime: this.model.fcEvent().end.format('h:mm A')
      });
      this.$el.find('.bootstrap-timepicker input').on('show.timepicker', function(e) {
        $(this).prev().toggle();
      });

      staffList.each(function(staff) {
        self.$el.find('.combobox')
          .append($('<option>', {'value': staff.get('username')})
          .text(staff.get('name') + ' (' + staff.get('username') + ')'));
      });
      $('.combobox').combobox({
        placeholder: 'Choose a staff'
      });
    },
    events: {
      'changed .spinner':     'staffNeededUpdate',
      'click #addNewShift':   'addNewShift',
      'click .removeShift':   'removeShift',
      'click .coverShift':    'coverShift',
      'click .shiftWithdraw': 'shiftWithdraw',
      'click .shiftSignUp':   'shiftSignUp'
    },
    onClose: function() {
      this.undelegateEvents();
    },
    staffNeededUpdate: function (e, val) {
      if (val !== this.model.get('staffNeeded')) {
        this.model.set('staffNeeded', val);   
      }
    },
    addNewShift: function() {
      var name  = this.$el.find('#staffInput').val();
      var event = this.model.fcEvent();
      
      var start = moment(new Date(event.start.format('MMM D YYYY ') + $('#shift-start').val()));
      var end   = moment(new Date(event.end.format('MMM D YYYY ') + $('#shift-end').val()));

      if(end.isBefore(start)) {
        end.add('d', 1);
      }

      var shift = { 
        staff: name,
        start: start.toDate(),
        end:   end.toDate()
      };

      this.model.set('shifts', this.model.get('shifts').concat(shift));
    },
    removeShift: function(e) {
      var shiftId = $(e.currentTarget).data('id');
      var shifts = this.model.get('shifts').filter(function(shift) {
        return shift.id !== shiftId;
      });
      this.model.set('shifts', shifts);
    },
    coverShift: function(e) {
      var shiftId = $(e.currentTarget).data('id');
      var setTo = !$(e.currentTarget).hasClass('active');

      var shifts = _(this.model.get('shifts')).clone().map(function(shift) {
        if(shift.id === shiftId) {
          shift.cover = setTo;
        }
        return shift;
      });
      this.model.set('shifts', shifts);
      this.model.save({shifts: shifts}, {patch: true});
      this.model.trigger('change:shifts');
    },
    shiftWithdraw: function(e) {
      var shiftId = $(e.currentTarget).data('id');

      var shifts = _(this.model.get('shifts')).clone().map(function(shift) {
        if(shift.id === shiftId) {
          shift.staff = '';
        }
        return shift;
      });
      this.model.set('shifts', shifts);
      this.model.save({shifts: shifts}, {patch: true});
      this.model.trigger('change:shifts');
      this.model.trigger('change', this.model);
    },
    shiftSignUp: function(e) {
      var shiftId = $(e.currentTarget).data('id');

      var shifts = _(this.model.get('shifts')).clone().map(function(shift) {
        if(shift.id === shiftId) {
          shift.staff = Spec.username;
        }
        return shift;
      });
      this.model.set('shifts', shifts);
      this.model.save({shifts: shifts}, {patch: true});
      this.model.trigger('change:shifts');
      this.model.trigger('change', this.model);
    }
  });

  var EditView = Backbone.View.extend({
    initialize: function() {
      if(Spec.permission < 10) {
        return false;
      }
      this.changed = {};
      this.render();
    },
    render: function() {
      var self = this;

      this.$el.html(_.template($('#edit-template').html(), {event: this.model.attributes}));

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
        self.changed[this.id] = params.newValue;
      });

      this.$el.modal('show'); 
    },
    events: {
      'click .modal-footer .btn-primary': 'submit',
      'hide':                             'close'
    },
    submit: function() {
      console.log(this.changed);

      var date = $.trim($('#startDate').text());
      this.changed.staffNeeded = parseInt($('#editSpinner input').val());
      this.changed.start      = moment(new Date(date + ' ' + $('#timepickerResStart').val())).toDate();
      this.changed.eventStart = moment(new Date(date + ' ' + $('#timepickerEventStart').val())).toDate();
      this.changed.end        = moment(new Date(date + ' ' + $('#timepickerResEnd').val()));
      this.changed.eventEnd   = moment(new Date(date + ' ' + $('#timepickerEventEnd').val()));
      this.changed.end      = this.changed.end
                                .add('d', this.changed.end.isBefore(this.changed.start) ? 1 : 0)
                                .toDate();
      this.changed.eventEnd = this.changed.eventEnd
                                .add('d', this.changed.eventEnd.isBefore(this.changed.eventStart) ? 1 : 0)
                                .toDate();

      //this.model.save(this.changed, {patch: true});
      this.model.set(this.changed);
      this.model.trigger('change');
      this.close();
    },
    close: function() {
      this.$el.undelegate();
    }
  });

  var Staff = Backbone.Model.extend({});
  var StaffList = Backbone.Collection.extend({
    model: Staff,
    url:   'staff/all',
    initialize: function() {
      this.fetch();
    }
  });

  var Inventory = Backbone.Model.extend({});
  var InventoryList = Backbone.Collection.extend({
    model: Inventory,
    url:   'inventory/all',
    initialize: function() {
      this.fetch();
    },
    getText: function(id) {
      var obj = this.findWhere({id: parseInt(id)});
      if(_.isUndefined(obj)) {
        throw new Error("No such inventory item exists.");
      } else {
        return obj.get('text');
      }
    }
  });

  var AppRouter = Backbone.Router.extend({
    routes: {
      "*filter": "all"
    }
  });

  var router = new AppRouter();
  Backbone.history.start();

  var staffList = new StaffList();
  var inventoryList = new InventoryList();

  var events = new Events({filter: Backbone.history.fragment});
  var eventsView = new EventsView({el: $("#calendar"), collection: events});

  router.on('route:all', function (filter) {
    $('a').removeClass('drop-active');
    $('a[href="#' + Backbone.history.fragment + '"]').addClass('drop-active');
    if (_.isNull(filter) || _.isUndefined(filter)) {
      router.navigate('hideCancelled', {
        trigger: true
      });
    }
    events.filter = filter;
    eventsView.$el.fullCalendar('refetchEvents');
  });

  //fetch user information to use in the front end
  //safe, because it's in a closure
  $.ajax({url: "user/"}).done(function(info) {
      Spec.username = info.username;
      Spec.permission = info.permission;
  });

  $('#gCalButton').click(function() {
    if($(this).hasClass('active')) {
      eventsView.$el.fullCalendar('removeEventSource', 'gCalEvents/');
    } else {
      eventsView.$el.fullCalendar('addEventSource', 'gCalEvents/');
    }
    $(this).toggleClass('active'); 
  });

  $(document).ajaxStart(function() {
    $("#eventButton i").removeClass('icon-book');
    $("#eventButton i").addClass('icon-refresh');
  });

  $(document).ajaxStop(function() {
    $("#eventButton i").removeClass('icon-refresh');
    $("#eventButton i").addClass('icon-book');
  });

  $('#eventButton').click(function() {
    hideModalPopover();
  });

  $(document).ajaxError(function(event, jqxhr, settings, exception) {
    console.log(settings.url);
    if(settings.url.indexOf('gCalEvents') > -1) {
      window.location.href = 'authorize/';
    }
  });

});
