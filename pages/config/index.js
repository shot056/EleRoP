'use strict';
var remote = require('remote');
var dialog = remote.require('dialog');
var browserWindow = remote.require('browser-window');

var jQuery;
var $ = jQuery = require('../../lib/jquery-1.11.3.min.js');

$( function() {
  var CAP    = remote.require('./lib/capture');
  var GRF    = remote.require('./lib/grfloader');
  var Config = remote.require('./lib/config');
  
  ( function() {
    CAP.getDeviceList().forEach( function( x ) {
      x.addresses.forEach( function( y ) {
        var opt = $("<option></option>");
        opt.attr("value", y.addr );
        opt.append( x.description + '(' + y.addr + ')' );
        if( Config.get('device') == y.addr )
          opt.attr("selected","selected");
        $("#id_device_list").append( opt );
      } );
    } );
  } )();
  ( function() {
    if( typeof Config.get('ro-path') === 'string' && Config.get('ro-path').length > 0 ) {
      $("#id_text_ro_path").val( Config.get('ro-path') );
    }
  } )();
  ( function() {
    Object.keys( Config.plugins ).forEach( function( k, i ) {
      var x = Config.plugins[ k ];
      console.log( x );
      var dd = $( "<dd>" );
      var label = $( "<label>" );
      var check = $( "<input>" );
      check.attr( "type", "checkbox" );
      check.attr( "name", "enabled_plugins" );
      check.attr( "value", x.id );
      label.append( check, x.name );
      dd.append( label );
      $( "#id_plugin_list" ).append( dd );
    } );
  } )();
  $("#id_btn_ro_path").click( function() {
    var focusedWindow = browserWindow.getFocusedWindow();
    dialog.showOpenDialog(focusedWindow, {
      properties: ['openDirectory']
    }, function( directories ){
      $("#id_text_ro_path").val( directories[0] );
    });
  } );
  $("#id_btn_save").click( function() {
    var device_addr = $("#id_device_list>option:selected").val();
    if( Config.get( "device" ) != device_addr ) {
      Config.set( "device", device_addr );
      CAP.startCapture( device_addr );
    }
    else if( !CAP.is_connected ) {
      CAP.startCapture( device_addr );
    }
    var ro_path = $( "#id_text_ro_path").val();
    if( Config.get( "ro-path" ) != ro_path )
      Config.set( "ro-path", ro_path );
    var enabled_plugins = $("input[name=enabled_plugins]").map( function( i, x ) { return $( x ).val() } );
    /*
    enabled_plugins.each( function( i, k ) {
      Config.plugins[ k ].show();
    } );
    */
    Config.set( "enabled_plugins", enabled_plugins );
    GRF.init( ro_path + "\\data.grf", function( err ) {
      if( err )
        dialog.showErrorBox( "エラー", "ROのパスが正しくありません" );
      else
        window.close();
    } );
  } );
  $("#id_btn_cancel").click( function() {
    window.close();
  } );
});
