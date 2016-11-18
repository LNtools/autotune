"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Backbone = require('backbone'),
    models = require('../models'),
    logger = require('../logger'),
    BaseView = require('./base_view'),
    Alpaca = require('../alpaca_patches'),
    ace = require('brace');

require('brace/mode/json');
require('brace/theme/textmate');

var EditBlueprint = BaseView.extend(require('./mixins/actions'), require('./mixins/form'), {
  template: require('../templates/blueprint.ejs'),
  events: {
    'change :input': 'stopListeningForChanges'
  },

  afterInit: function() {
    this.on('load', function() {
      this.listenTo(this.app, 'loadingStart', this.stopListeningForChanges, this);
      this.listenTo(this.app, 'loadingStop', this.listenForChanges, this);
    }, this);

    this.on('unload', function() {
      this.stopListening(this.app);
      this.stopListeningForChanges();
    }, this);
  },

  listenForChanges: function() {
    if ( !this.model.isNew() && !this.listening ) {
      logger.debug('Start listening for changes');
      this.listenTo(this.app.messages,
                    'change:blueprint:' + this.model.id,
                    this.updateStatus, this);
      this.listening = true;
    }
  },

  stopListeningForChanges: function() {
    logger.debug('Stop listening for changes');
    this.stopListening(this.app.messages);
    this.listening = false;
  },

  updateStatus: function(data) {
    var status = data.status;
    logger.debug('Update blueprint status: ' + status);
    this.model.set('status', status);
    this.render();
  },

  beforeRender: function() {
    this.stopListeningForChanges();
  },

  afterRender: function() {
    var $form = this.$el.find('#new-blueprint');
    $($form).keypress(function(event){
      if (event.keyCode === 10 || event.keyCode === 13){
        event.preventDefault();
      }
    });

    if ( this.model.hasForm() ) {
      var formData = this.model.get('config').form,
          data = formData.data,
          schema = formData.schema,
          options = formData.options;

      this.setSourceHeight();

      this.editor = ace.edit('schema');
      this.editor.setTheme("ace/theme/textmate");
      this.editor.getSession().setMode("ace/mode/json");
      this.editor.renderer.setHScrollBarAlwaysVisible(false);
      this.editor.setShowPrintMargin(false);
      this.editor.setValue( JSON.stringify( formData , null, "  " ), -1 );

      var debouncedUpdatePreview = _.debounce(
        _.bind(this.updateFormPreview, this), 500);

      this.editor.on("change", function() {
        logger.debug('editor content changed');
        debouncedUpdatePreview();
      });

      this.updateFormPreview();
    }

    this.listenForChanges();
  },

  updateFormPreview: function() {
    logger.debug('Updating preview');
    var mainPreviewField = this.mainPreviewField,
        formData, schema, options, data;
    try {
      formData = JSON.parse(this.editor.getValue());
      schema = formData.schema;
      options = formData.options || {};
      data = formData.data;
    } catch (ex) {
      logger.error("Can't update preview, JSON is bad");
      return;
    }

    if (mainPreviewField) {
      data = mainPreviewField.getValue();
      mainPreviewField.destroy();
      mainPreviewField = null;
    }

    var config = {
      schema: schema,
      options: options,
      postRender: function(form) {
        logger.debug('post render');
        mainPreviewField = form;
        $('.message').empty();
      },
      error: function(err) {
        Alpaca.defaultErrorCallback(err);
        $('.message')
          .html('<div class="alert alert-danger" role="alert">' + err.message + '</div>');
        logger.error("Alpaca encountered an error while previewing form -> " + err.message);
      }
    };

    if (data) { config.data = data; }

    this.$('#previewDiv').alpaca(config);
  },

  setSourceHeight: function() {
    logger.log(this.$('#builder').parent().length > 0);
    if ( this.$('#builder').parent().length > 0 ) {
      var top = this.$('#builder').parent().offset().top,
          height = $('body').height() - this.$('#builder').parent().height(),
          bottom = height - top;

      logger.debug(top, height, bottom);

      this.$('#builder').height(
        $(window).height() - ( top + bottom )
      );
    }
  }
} );

module.exports = EditBlueprint;
