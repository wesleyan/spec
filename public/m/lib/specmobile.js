window.HomeView = Backbone.View.extend({

    template:_.template($('#home').html()),

    render:function (eventName) {
        $(this.el).html(this.template());
        return this;
    }
});

window.EventView = Backbone.View.extend({

    template:_.template($('#event').html()),

    render:function (eventName) {
        $(this.el).html(this.template());
        return this;
    }
});

window.OptionsView = Backbone.View.extend({

    template:_.template($('#options').html()),

    render:function (eventName) {
        $(this.el).html(this.template());
        return this;
    }
});

var AppRouter = Backbone.Router.extend({

    routes:{
        "":"home",
        "event/:id":"event",
        "options":"options"
    },

    initialize:function () {
        // Handle back button throughout the application
        $('.back').live('click', function(event) {
            window.history.back();
            return false;
        });
        this.firstPage = true;
    },

    home:function () {
        console.log('#home');
        this.changePage(new HomeView());     

    },

    event:function (id) {
        console.log('#event and the id is ' + id);
        
        SpecM.theEvent = $.grep(SpecM.events, function(e){ return e['_id'] == id })[0];
        this.changePage(new EventView());
    },

    options:function () {
        console.log('#options');
        this.changePage(new OptionsView());
    },

    changePage:function (page) {
        $(page.el).attr('data-role', 'page');
        page.render();
        $('body').append($(page.el));
        var transition = $.mobile.defaultPageTransition;
        // We don't want to slide the first page
        if (this.firstPage) {
            transition = 'none';
            this.firstPage = false;
        }
        $.mobile.changePage($(page.el), {changeHash:false, transition: transition});
    }

});


var SpecM = {};
var today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
SpecM.get = function(start, end) {
    $.ajax({
        type: "GET",
        url: "../events/" ,
        data: {
            filter: 'null',
            'start': start.getTime()/1000,
            'end': end.getTime()/1000
        }
    }).done(function(msg) {
        var template = _.template($("#event_list_template").html(), {
            'events': msg
        });
        $('#eventList').html(template);
        $('#eventList').listview('refresh');
        SpecM.events = msg;
    });
}

$(document).ready(function () {
    console.log('document ready');
    app = new AppRouter();
    Backbone.history.start();
    $.mobile.activeBtnClass = '';
    _.templateSettings.variable = "rc";

    SpecM.get(today, tomorrow);

    $('body').on('click','#eventList li',function(e) {
        //Do something before going to the event page
        //console.log('event page');
        
    });

    $('#left').on('click',function(e) {
        console.log('go to the previous day');
        
    });
    $('#today').on('click',function(e) {
        console.log('go to today');
        
    });
    $('#right').on('click',function(e) {
        console.log('go to the next day');
    });
});

function saveOptions() { // Gets called on the Options page when you hit the Back button
    var xld = $('#xld').val();
    var time = $('#time').val();

    cookieMonster("xld", xld);
    cookieMonster("time", time);
}

function cookieMonster(name, val) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + 120); // 120 days to expire
    document.cookie = name + '=' + val + '; expires=' + exdate.toUTCString();
}