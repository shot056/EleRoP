'use strict';

var BrowserWindow = require('browser-window');

function BMViewer() {
  var self = this;

  self.id   = 'BMViewer';
  self.name = 'バトルモードビューワ';

  self.show = function() {
    var window = new BrowserWindow( { width: 200, height: 200, resizable: false, autoHideMenuBar: true } );
    window.loadURL( 'file://' + __dirname + '/index.html' );
    window.on( 'closed', function() {
      window = null;
    } );
    window.show();
  };
  return self;
};

module.exports = new BMViewer();
