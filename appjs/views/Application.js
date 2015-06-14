"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Backbone = require('backbone'),
    PNotify = require('pnotify'),
    models = require('../models'),
    BaseView = require('./BaseView');

module.exports = BaseView.extend({
  className: 'container-fluid',
  template: require('../templates/application.ejs'),
  notifications: [],

  display: function(view) {
    this.$('#main').empty().append(view.$el);
    return this;
  },

  spinStart: function() {
    this.$('#spinner').show();
    return this;
  },

  spinStop: function() {
    _.defer(_.bind(function() {
      this.$('#spinner').fadeOut('fast');
    }, this));
    return this;
  },

  setTab: function(name) {
    this.$('#nav [data-tab]').removeClass('active');
    if(name) { this.$('#nav [data-tab='+name+']').addClass('active'); }
    return this;
  },

  error: function(message) {
    return this.alert(message, 'error');
  },

  warning: function(message) {
    return this.alert(message, 'notice');
  },

  success: function(message) {
    return this.alert(message, 'success');
  },

  alert: function(message, level, permanent) {
    var opts = {
      text: message,
      type: level || 'info',
      addclass: "stack-bottomright",
      stack: this.stack,
      buttons: { sticker: false }
    };

    if ( permanent ) {
      _.extend(opts, {
        buttons: { close: false, sticker: false },
        hide: false
      });
      this.notifications.push( new PNotify(opts) );
    } else {
      new PNotify(opts);
    }
    return this;
  },

  clearError: function() {
    _.each(this.notifications, function(n) {
      if ( n.remove ) { n.remove(); }
    });
    this.notifications = [];
    return this;
  }
});
