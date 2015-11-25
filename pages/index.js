'use strict';
var sprintf = require('sprintf').sprintf;
var remote = require('remote');
var BrowserWindow = remote.require('browser-window');
var jQuery;
var $ = jQuery = require('../lib/jquery-1.11.3.min.js');

$( function() {
  var Capture = remote.require('./lib/capture');
  Capture.on( 'connected', function( tf, addr ) {
    $("#id_status").removeClass("error").addClass("success").empty().append( '接続中 (' + addr + ')' );
  } );
  /*
    082d と 099d の組み合わせでキャラ一覧をとるらしい
    https://github.com/vthibault/roBrowser/blob/82c6fe7a478c09e57e9aa1df04559a7f31ba7987/src/Network/PacketStructure.js#L10173
    https://github.com/vthibault/roBrowser/blob/82c6fe7a478c09e57e9aa1df04559a7f31ba7987/src/Network/PacketStructure.js#L10974
    https://github.com/vthibault/roBrowser/blob/82c6fe7a478c09e57e9aa1df04559a7f31ba7987/src/Network/PacketVerManager.js#L110
  */
  /*
    R 0071 <charactor ID>.l <map name>.16B <ip>.l <port>.w
    キャラクタ選択成功&マップ名&ゲーム鯖IP/port
  */
  /*
  Capture.on( 'packet_0071', function( len, buf ) {
    var charid  = buf.slice( 0, 4 ).readUInt32LE();
    var mapname = buf.slice( 4, 4 + 16 ).toString();
    var mapip   = buf.slice( 4 + 16, 4 + 16 + 4 );
    var mapport = buf.slice( 4 + 16 + 4, 4 + 16 + 4 + 2 ).readUInt16LE();
    //console.log( "on packet:0071", { charid: charid, mapname: mapname, mapip: mapip, mapport: mapport } );
    $("#id_map").empty().append( sprintf('%s (%d.%d.%d.%d)', mapname, mapip[0], mapip[1], mapip[2], mapip[3] ) );
  } );
  */
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
