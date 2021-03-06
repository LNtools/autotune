"use strict";

var _ = require('underscore'),
    Backbone = require('backbone'),
    logger = require('./logger');

/**
 * Initialize the listener
 */
function Listener(opts) {
  this.config = _.defaults(opts || {}, {
    url: '/changemessages'
  });
}

_.extend(Listener.prototype, Backbone.Events, {
  /**
   * Start the server-side events listener
   */
  start: function(){
    if ( this.paused ) { this.paused = false; }
    if ( this.hasStatus('open', 'connecting') ) { return; }

    if ( typeof(window) !== 'undefined' && window.EventSource ) {
      this.conn = new window.EventSource(this.config.url);
    } else {
      return this;
    }

    this.conn.addEventListener('change', _.bind(this.handleChange, this));
    this.conn.addEventListener('error',  _.bind(this.handleError, this));
    this.conn.addEventListener('open',   _.bind(this.handleOpen, this));
    this.conn.addEventListener('close',  _.bind(this.handleClose, this));

    return this;
  },

  /**
   * Disable the server side event listener
   */
  stop: function() {
    logger.debug('Stopping listener now');
    if ( this.hasStatus('open', 'connecting') ) {
      logger.debug('Close event listener');
      this.conn.close();
    }

    this.trigger('stop');
    return this;
  },

  stopAfter: function(seconds) {
    if ( this.hasStatus('closed') ) { return; }

    logger.debug('Stopping listener in ' + seconds);
    if ( this.stopTimeout ) { clearTimeout(this.stopTimeout); }
    this.stopTimeout = setTimeout(_.bind(this.stop, this), seconds*1000);
    return this;
  },

  cancelStop: function() {
    if ( this.hasStatus('closed') || !this.stopTimeout ) { return; }

    logger.debug('Canceling listener stop');
    clearTimeout(this.stopTimeout);
    return this;
  },

  pause: function() {
    logger.debug('Pausing event listener');
    this.paused = true;
  },

  /**
   * Check the status of the listener.
   * @param string status Status of the connection (open, closed, connecting)
   * @return boolean
   */
  hasStatus: function() {
    var iteratee = function(m, i) {
      return m || this.conn.readyState === this.conn[i.toUpperCase()];
    };
    return this.conn && _.reduce( arguments, _.bind(iteratee, this), false );
  },

  handleChange: function(evt) {
    if ( this.paused ) { return; }
    var data = JSON.parse(evt.data);

    logger.debug('change', data);

    this.trigger('change',
                 _.pick(data, 'type', 'id', 'status'));
    this.trigger(['change', data.type].join(':'),
                 _.pick(data, 'id', 'status'));
    this.trigger(['change', data.type, data.id].join(':'),
                 data.status);
  },

  handleError: function(evt) {
    logger.error('Connection error', evt);
    this.trigger('error', evt);
  },

  handleOpen: function(evt) {
    logger.debug('Connection open', evt);
    this.openTime = evt.timeStamp;
    this.trigger('open', evt);
  },

  handleClose: function(evt) {
    var timeConnected = ( evt.timeStamp - this.openTime ) / 1000;
    logger.debug(
      'Connection closed by server in ' + timeConnected + ' seconds', evt);
    this.conn.close();
    if ( !this.paused ) { this.start(); }
  }
});

module.exports = Listener;
