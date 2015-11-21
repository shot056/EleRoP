'use strict';
var remote = require('remote');
var BrowserWindow = remote.require('browser-window');
var jQuery;
var $ = jQuery = require('../lib/jquery-1.11.3.min.js');

$( function() {
  var Capture = remote.require('./lib/capture');
  Capture.on( 'connected', function( tf, addr ) {
    $("#id_status").removeClass("error").addClass("success").empty().append( '接続中 (' + addr + ')' );
  } );
  if( Capture.is_connected )
    $("#id_status").removeClass("error").addClass("success").empty().append( '接続中 (' + Capture.capture_addr + ')' );
  $("#id_btn_quit").click( function() {
    remote.require('./lib/config').save( function( err ) {
      if( err ) throw err;
      remote.require('app').quit();
    } );
  } );
  $("#id_btn_config").click( function() {
    var configWindow = new BrowserWindow( { width: 800, height: 600, resizable: false, autoHideMenuBar: true } );
    configWindow.loadURL( 'file://' + __dirname + '/config/index.html' );
    configWindow.on( 'closed', function() {
      configWindow = null;
    } );
    configWindow.show();
  } );
} );
