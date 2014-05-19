'use strict';
// Source: public/src/js/db/backgrid-filter.min.js
/*
  backgrid-filter
  http://github.com/wyuenho/backgrid

  Copyright (c) 2013 Jimmy Yuen Ho Wong and contributors
  Licensed under the MIT @license.
*/
!function(a,b){"object"==typeof exports?!function(){var a;try{a=require("lunr")}catch(c){}module.exports=b(require("underscore"),require("backbone"),require("backgrid"),a)}():b(a._,a.Backbone,a.Backgrid,a.lunr)}(this,function(a,b,c,d){"use strict";var e=c.Extension.ServerSideFilter=b.View.extend({tagName:"form",className:"backgrid-filter form-search",template:a.template('<span class="search">&nbsp;</span><input type="search" <% if (placeholder) { %> placeholder="<%- placeholder %>" <% } %> name="<%- name %>" /><a class="clear" data-backgrid-action="clear" href="#">&times;</a>',null,{variable:null}),events:{"keyup input[type=search]":"showClearButtonMaybe","click a[data-backgrid-action=clear]":"clear",submit:"search"},name:"q",placeholder:null,initialize:function(a){e.__super__.initialize.apply(this,arguments),this.name=a.name||this.name,this.placeholder=a.placeholder||this.placeholder,this.template=a.template||this.template;var c=this.collection,d=this;b.PageableCollection&&c instanceof b.PageableCollection&&"server"==c.mode&&(c.queryParams[this.name]=function(){return d.searchBox().val()||null})},showClearButtonMaybe:function(){var a=this.clearButton(),b=this.searchBox().val();b?a.show():a.hide()},searchBox:function(){return this.$el.find("input[type=search]")},clearButton:function(){return this.$el.find("a[data-backgrid-action=clear]")},search:function(a){a&&a.preventDefault();var c={},d=this.searchBox().val();d&&(c[this.name]=d);var e=this.collection;b.PageableCollection&&e instanceof b.PageableCollection?e.getFirstPage({data:c,reset:!0,fetch:!0}):e.fetch({data:c,reset:!0})},clear:function(a){a&&a.preventDefault(),this.searchBox().val(null),this.showClearButtonMaybe();var c=this.collection;b.PageableCollection&&c instanceof b.PageableCollection?c.getFirstPage({reset:!0,fetch:!0}):c.fetch({reset:!0})},render:function(){return this.$el.empty().append(this.template({name:this.name,placeholder:this.placeholder,value:this.value})),this.showClearButtonMaybe(),this.delegateEvents(),this}}),f=c.Extension.ClientSideFilter=e.extend({events:a.extend({},e.prototype.events,{"click a[data-backgrid-action=clear]":function(a){a.preventDefault(),this.clear()},"keydown input[type=search]":"search",submit:function(a){a.preventDefault(),this.search()}}),fields:null,wait:149,initialize:function(b){f.__super__.initialize.apply(this,arguments),this.fields=b.fields||this.fields,this.wait=b.wait||this.wait,this._debounceMethods(["search","clear"]);var c=this.collection=this.collection.fullCollection||this.collection,d=this.shadowCollection=c.clone();this.listenTo(c,"add",function(a,b,c){d.add(a,c)}),this.listenTo(c,"remove",function(a,b,c){d.remove(a,c)}),this.listenTo(c,"sort",function(a){this.searchBox().val()||d.reset(a.models)}),this.listenTo(c,"reset",function(b,c){c=a.extend({reindex:!0},c||{}),c.reindex&&null==c.from&&null==c.to&&d.reset(b.models)})},_debounceMethods:function(b){a.isString(b)&&(b=[b]),this.undelegateEvents();for(var c=0,d=b.length;d>c;c++){var e=b[c],f=this[e];this[e]=a.debounce(f,this.wait)}this.delegateEvents()},makeRegExp:function(a){return new RegExp(a.trim().split(/\s+/).join("|"),"i")},makeMatcher:function(a){var b=this.makeRegExp(a);return function(a){for(var c=this.fields||a.keys(),d=0,e=c.length;e>d;d++)if(b.test(a.get(c[d])+""))return!0;return!1}},search:function(){var b=a.bind(this.makeMatcher(this.searchBox().val()),this),c=this.collection;c.pageableCollection&&c.pageableCollection.getFirstPage({silent:!0}),c.reset(this.shadowCollection.filter(b),{reindex:!1})},clear:function(){this.searchBox().val(null),this.showClearButtonMaybe();var a=this.collection;a.pageableCollection&&a.pageableCollection.getFirstPage({silent:!0}),a.reset(this.shadowCollection.models,{reindex:!1})}}),g=c.Extension.LunrFilter=f.extend({ref:"id",fields:null,initialize:function(a){g.__super__.initialize.apply(this,arguments),this.ref=a.ref||this.ref;var b=this.collection=this.collection.fullCollection||this.collection;this.listenTo(b,"add",this.addToIndex),this.listenTo(b,"remove",this.removeFromIndex),this.listenTo(b,"reset",this.resetIndex),this.listenTo(b,"change",this.updateIndex),this.resetIndex(b)},resetIndex:function(b,c){if(c=a.extend({reindex:!0},c||{}),c.reindex){var e=this;this.index=d(function(){a.each(e.fields,function(a,b){this.field(b,a),this.ref(e.ref)},this)}),b.each(function(a){this.addToIndex(a)},this)}},addToIndex:function(a){var b=this.index,c=a.toJSON();b.documentStore.has(c[this.ref])?b.update(c):b.add(c)},removeFromIndex:function(a){var b=this.index,c=a.toJSON();b.documentStore.has(c[this.ref])&&b.remove(c)},updateIndex:function(b){var c=b.changedAttributes();c&&!a.isEmpty(a.intersection(a.keys(this.fields),a.keys(c)))&&this.index.update(b.toJSON())},search:function(){var a=this.collection;if(!this.searchBox().val())return void a.reset(this.shadowCollection.models,{reindex:!1});for(var b=this.index.search(this.searchBox().val()),c=[],d=0;d<b.length;d++){var e=b[d];c.push(this.shadowCollection.get(e.ref))}a.pageableCollection&&a.pageableCollection.getFirstPage({silent:!0}),a.reset(c,{reindex:!1})}})});
// Source: public/src/js/db/backgrid-paginator.min.js
/*
  backgrid-paginator
  http://github.com/wyuenho/backgrid

  Copyright (c) 2013 Jimmy Yuen Ho Wong and contributors
  Licensed under the MIT @license.
*/
!function(a,b){"object"==typeof exports?module.exports=b(require("underscore"),require("backbone"),require("backgrid"),require("backbone-pageable")):b(a._,a.Backbone,a.Backgrid)}(this,function(a,b,c){"use strict";var d=c.Extension.PageHandle=b.View.extend({tagName:"li",events:{"click a":"changePage"},title:a.template("Page <%- label %>",null,{variable:null}),isRewind:!1,isBack:!1,isForward:!1,isFastForward:!1,initialize:function(b){var c=this.collection,d=c.state,e=d.currentPage,f=d.firstPage,g=d.lastPage;a.extend(this,a.pick(b,["isRewind","isBack","isForward","isFastForward"]));var h;this.isRewind?h=f:this.isBack?h=Math.max(f,e-1):this.isForward?h=Math.min(g,e+1):this.isFastForward?h=g:(h=+b.pageIndex,h=f?h+1:h),this.pageIndex=h,this.label=(b.label||(f?h:h+1))+"";var i=b.title||this.title;this.title=a.isFunction(i)?i({label:this.label}):i},render:function(){this.$el.empty();var a=document.createElement("a");a.href="#",this.title&&(a.title=this.title),a.innerHTML=this.label,this.el.appendChild(a);var b=this.collection,c=b.state,d=c.currentPage,e=this.pageIndex;return this.isRewind&&d==c.firstPage||this.isBack&&!b.hasPrevious()||this.isForward&&!b.hasNext()||this.isFastForward&&(d==c.lastPage||c.totalPages<1)?this.$el.addClass("disabled"):this.isRewind||this.isBack||this.isForward||this.isFastForward||c.currentPage!=e||this.$el.addClass("active"),this.delegateEvents(),this},changePage:function(a){a.preventDefault();var b=this.$el,c=this.collection;return b.hasClass("active")||b.hasClass("disabled")||(this.isRewind?c.getFirstPage():this.isBack?c.getPreviousPage():this.isForward?c.getNextPage():this.isFastForward?c.getLastPage():c.getPage(this.pageIndex,{reset:!0})),this}}),e=c.Extension.Paginator=b.View.extend({className:"backgrid-paginator",windowSize:10,slideScale:.5,controls:{rewind:{label:"《",title:"First"},back:{label:"〈",title:"Previous"},forward:{label:"〉",title:"Next"},fastForward:{label:"》",title:"Last"}},renderIndexedPageHandles:!0,pageHandle:d,goBackFirstOnSort:!0,initialize:function(b){var c=this;c.controls=a.defaults(b.controls||{},c.controls,e.prototype.controls),a.extend(c,a.pick(b||{},"windowSize","pageHandle","slideScale","goBackFirstOnSort","renderIndexedPageHandles"));var d=c.collection;c.listenTo(d,"add",c.render),c.listenTo(d,"remove",c.render),c.listenTo(d,"reset",c.render),c.listenTo(d,"backgrid:sorted",function(){c.goBackFirstOnSort&&d.getFirstPage({reset:!0})})},slideMaybe:function(a,b,c,d){return Math.round(c%d/d)},slideThisMuch:function(a,b,c,d,e){return~~(d*e)},_calculateWindow:function(){var a=this.collection,b=a.state,c=b.firstPage,d=+b.lastPage;d=Math.max(0,c?d-1:d);var e=Math.max(b.currentPage,b.firstPage);e=c?e-1:e;var f=this.windowSize,g=this.slideScale,h=Math.floor(e/f)*f;e<=d-this.slideThisMuch()&&(h+=this.slideMaybe(c,d,e,f,g)*this.slideThisMuch(c,d,e,f,g));var i=Math.min(d+1,h+f);return[h,i]},makeHandles:function(){var b=[],c=this.collection,d=this._calculateWindow(),e=d[0],f=d[1];if(this.renderIndexedPageHandles)for(var g=e;f>g;g++)b.push(new this.pageHandle({collection:c,pageIndex:g}));var h=this.controls;return a.each(["back","rewind","forward","fastForward"],function(a){var d=h[a];if(d){var e={collection:c,title:d.title,label:d.label};e["is"+a.slice(0,1).toUpperCase()+a.slice(1)]=!0;var f=new this.pageHandle(e);"rewind"==a||"back"==a?b.unshift(f):b.push(f)}},this),b},render:function(){if(this.$el.empty(),this.handles)for(var a=0,b=this.handles.length;b>a;a++)this.handles[a].remove();for(var c=this.handles=this.makeHandles(),d=document.createElement("ul"),a=0;a<c.length;a++)d.appendChild(c[a].render().el);return this.el.appendChild(d),this}})});
// Source: public/src/js/db/backgrid-select-all.min.js
/*
  backgrid-select-all
  http://github.com/wyuenho/backgrid

  Copyright (c) 2013 Jimmy Yuen Ho Wong and contributors
  Licensed under the MIT @license.
*/
(function (root, factory) {

  // CommonJS
  if (typeof exports == "object") {
    module.exports = factory(require("backbone"), require("backgrid"));
  }
  // Browser
  else factory(root.Backbone, root.Backgrid);

}(this, function (Backbone, Backgrid) {

/**
     Renders a checkbox for row selection.

     @class Backgrid.Extension.SelectRowCell
     @extends Backbone.View
  */
  var SelectRowCell = Backgrid.Extension.SelectRowCell = Backbone.View.extend({

    /** @property */
    className: "select-row-cell",

    /** @property */
    tagName: "td",

    /** @property */
    events: {
      "keydown input[type=checkbox]": "onKeydown",
      "change input[type=checkbox]": "onChange",
      "click input[type=checkbox]": "enterEditMode"
    },

    /**
       Initializer. If the underlying model triggers a `select` event, this cell
       will change its checked value according to the event's `selected` value.

       @param {Object} options
       @param {Backgrid.Column} options.column
       @param {Backbone.Model} options.model
    */
    initialize: function (options) {

      this.column = options.column;
      if (!(this.column instanceof Backgrid.Column)) {
        this.column = new Backgrid.Column(this.column);
      }

      var column = this.column, model = this.model, $el = this.$el;
      this.listenTo(column, "change:renderable", function (column, renderable) {
        $el.toggleClass("renderable", renderable);
      });

      //if (Backgrid.callByNeed(column.renderable(), column, model)) $el.addClass("renderable");

      this.listenTo(model, "backgrid:select", function (model, selected) {
        this.$el.find("input[type=checkbox]").prop("checked", selected).change();
      });
    },

    /**
       Focuses the checkbox.
    */
    enterEditMode: function () {
      this.$el.find("input[type=checkbox]").focus();
    },

    /**
       Unfocuses the checkbox.
    */
    exitEditMode: function () {
      this.$el.find("input[type=checkbox]").blur();
    },

    /**
       Process keyboard navigation.
    */
    onKeydown: function (e) {
      var command = new Backgrid.Command(e);
      if (command.passThru()) return true; // skip ahead to `change`
      if (command.cancel()) {
        e.stopPropagation();
        this.$el.find("input[type=checkbox]").blur();
      }
      else if (command.save() || command.moveLeft() || command.moveRight() ||
               command.moveUp() || command.moveDown()) {
        e.preventDefault();
        e.stopPropagation();
        this.model.trigger("backgrid:edited", this.model, this.column, command);
      }
    },

    /**
       When the checkbox's value changes, this method will trigger a Backbone
       `backgrid:selected` event with a reference of the model and the
       checkbox's `checked` value.
    */
    onChange: function () {
      var checked = this.$el.find("input[type=checkbox]").prop("checked");
      this.$el.parent().toggleClass("selected", checked);
      this.model.trigger("backgrid:selected", this.model, checked);
    },

    /**
       Renders a checkbox in a table cell.
    */
    render: function () {
      this.$el.empty().append('<input tabindex="-1" type="checkbox" />');
      this.delegateEvents();
      return this;
    }

  });

  /**
     Renders a checkbox to select all rows on the current page.

     @class Backgrid.Extension.SelectAllHeaderCell
     @extends Backgrid.Extension.SelectRowCell
  */
  var SelectAllHeaderCell = Backgrid.Extension.SelectAllHeaderCell = SelectRowCell.extend({

    /** @property */
    className: "select-all-header-cell",

    /** @property */
    tagName: "th",

    /**
       Initializer. When this cell's checkbox is checked, a Backbone
       `backgrid:select` event will be triggered for each model for the current
       page in the underlying collection. If a `SelectRowCell` instance exists
       for the rows representing the models, they will check themselves. If any
       of the SelectRowCell instances trigger a Backbone `backgrid:selected`
       event with a `false` value, this cell will uncheck its checkbox. In the
       event of a Backbone `backgrid:refresh` event, which is triggered when the
       body refreshes its rows, which can happen under a number of conditions
       such as paging or the columns were reset, this cell will still remember
       the previously selected models and trigger a Backbone `backgrid:select`
       event on them such that the SelectRowCells can recheck themselves upon
       refreshing.

       @param {Object} options
       @param {Backgrid.Column} options.column
       @param {Backbone.Collection} options.collection
    */
    initialize: function (options) {

      this.column = options.column;
      if (!(this.column instanceof Backgrid.Column)) {
        this.column = new Backgrid.Column(this.column);
      }

      var collection = this.collection;
      var selectedModels = this.selectedModels = {};
      this.listenTo(collection.fullCollection || collection,
                    "backgrid:selected", function (model, selected) {
        if (selected) selectedModels[model.id || model.cid] = 1;
        else {
          delete selectedModels[model.id || model.cid];
          this.$el.find("input[type=checkbox]").prop("checked", false);
        }
      });

      this.listenTo(collection.fullCollection || collection, "remove", function (model) {
        delete selectedModels[model.id || model.cid];
      });

      this.listenTo(collection, "backgrid:refresh", function () {
        var checked = this.$el.find("input[type=checkbox]").prop("checked");
        for (var i = 0; i < collection.length; i++) {
          var model = collection.at(i);
          if (checked || selectedModels[model.id || model.cid]) {
            model.trigger("backgrid:select", model, true);
          }
        }
      });

      var column = this.column, $el = this.$el;
      this.listenTo(column, "change:renderable", function (column, renderable) {
        $el.toggleClass("renderable", renderable);
      });

      //if (Backgrid.callByNeed(column.renderable(), column, collection)) $el.addClass("renderable");
    },

    /**
       Propagates the checked value of this checkbox to all the models of the
       underlying collection by triggering a Backbone `backgrid:select` event on
       the models on the current page, passing each model and the current
       `checked` value of the checkbox in each event.

       A `backgrid:selected` event will also be triggered with the current
       `checked` value on all the models regardless of whether they are on the
       current page.

       This method triggers a 'backgrid:select-all' event on the collection
       afterwards.
    */
    onChange: function () {
      var checked = this.$el.find("input[type=checkbox]").prop("checked");

      var collection = this.collection;
      collection.each(function (model) {
        model.trigger("backgrid:select", model, checked);
      });

      if (collection.fullCollection) {
        collection.fullCollection.each(function (model) {
          if (!collection.get(model.cid)) {
            model.trigger("backgrid:selected", model, checked);
          }
        });
      }

      this.collection.trigger("backgrid:select-all", this.collection, checked);
    }

  });

  /**
     Convenient method to retrieve a list of selected models. This method only
     exists when the `SelectAll` extension has been included. Selected models
     are retained across pagination.

     @member Backgrid.Grid
     @return {Array.<Backbone.Model>}
  */
  Backgrid.Grid.prototype.getSelectedModels = function () {
    var selectAllHeaderCell;
    var headerCells = this.header.row.cells;
    for (var i = 0, l = headerCells.length; i < l; i++) {
      var headerCell = headerCells[i];
      if (headerCell instanceof SelectAllHeaderCell) {
        selectAllHeaderCell = headerCell;
        break;
      }
    }

    var result = [];
    if (selectAllHeaderCell) {
      var selectedModels = selectAllHeaderCell.selectedModels;
      var collection = this.collection.fullCollection || this.collection;
      for (var modelId in selectedModels) {
        result.push(collection.get(modelId));
      }
    }

    return result;
  };

  /**
     Convenient method to deselect the selected models. This method is only
     available when the `SelectAll` extension has been included.

     @member Backgrid.Grid
   */
  Backgrid.Grid.prototype.clearSelectedModels = function () {
    var selectedModels = this.getSelectedModels();
    for (var i = 0, l = selectedModels.length; i < l; i++) {
      var model = selectedModels[i];
      model.trigger("backgrid:select", model, false);
    }
  };

}));
