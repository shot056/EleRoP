'use strict';
var remote = require('remote');

var jQuery;
var $ = jQuery = require('../../lib/jquery-1.11.3.min.js');

$( function() {
  var CAP    = remote.require('./lib/capture');
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
  $("#id_btn_save").click( function() {
    var device_addr = $("#id_device_list>option:selected").val();
    if( Config.get( "device" ) != device_addr ) {
      Config.set( "device", device_addr );
      CAP.startCapture( device_addr );
    }
    window.close();
  } );
  $("#id_btn_cancel").click( function() {
    window.close();
  } );
});
