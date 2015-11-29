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
  var charmap = {};
  Capture.on( 'R099d', function( addr, port, len, buf ) {
    console.log( "R:099d", buf );
    if( len > 0 ) {
      var json = Capture.packet2json( buf, [ { k: 'Chars', t: 'loop', c: 3, s: [ { k: 'GID',         t: 'ulong' },
                                                                                 { k: 'Exp',         t: 'long' },
                                                                                 { k: 'Money',       t: 'long' },
                                                                                 { k: 'JobExp',      t: 'long' },
                                                                                 { k: 'JobLv',       t: 'long' },
                                                                                 { k: 'bState',      t: 'long' },
                                                                                 { k: 'hState',      t: 'long' },
                                                                                 { k: 'eState',      t: 'long' },
                                                                                 { k: 'Virtue',      t: 'long' },
                                                                                 { k: 'Honor',       t: 'long' },
                                                                                 { k: 'JobPoint',    t: 'int' },
                                                                                 { k: 'HP',          t: 'long' }, //
                                                                                 { k: 'MaxHP',       t: 'long' }, //
                                                                                 { k: 'SP',          t: 'int' },
                                                                                 { k: 'MaxSP',       t: 'int' },
                                                                                 { k: 'Speed',       t: 'int' },
                                                                                 { k: 'Job',         t: 'int' },
                                                                                 { k: 'Head',        t: 'int' },
                                                                                 { k: 'Weapon',      t: 'long' }, //
                                                                                 { k: 'Lv',          t: 'int' },
                                                                                 { k: 'SpPoint',     t: 'int' },
                                                                                 { k: 'Accessory',   t: 'int' },
                                                                                 { k: 'Shield',      t: 'int' },
                                                                                 { k: 'Accessory2',  t: 'int' },
                                                                                 { k: 'Accessory3',  t: 'int' },
                                                                                 { k: 'HeadPalette', t: 'int' },
                                                                                 { k: 'BodyPalette', t: 'int' },
                                                                                 { k: 'Name',        t: 'string', l: 24 },
                                                                                 { k: 'Str',         t: 'ushort' },
                                                                                 { k: 'Agi',         t: 'ushort' },
                                                                                 { k: 'Vit',         t: 'ushort' },
                                                                                 { k: 'Int',         t: 'ushort' },
                                                                                 { k: 'Dex',         t: 'ushort' },
                                                                                 { k: 'Luk',         t: 'ushort' },
                                                                                 { k: 'CharNum',     t: 'ushort' },
                                                                                 { k: 'HairColor',   t: 'ushort' },
                                                                                 { k: 'bIsChangedCharName', t: 'int' },
                                                                                 { k: 'lastMap',     t: 'string', l: 16 },
                                                                                 { k: 'DeleteDate',  t: 'long' },
                                                                                 { k: 'Robe',        t: 'long' },
                                                                                 { k: 'SlotAddon',   t: 'long' },
                                                                                 { k: 'RenameAddon', t: 'long' },
                                                                                 { k: 'Sex',         t: 'ushort' } ] } ] );
      if( typeof json.Chars == 'object' && json.Chars instanceof Array )
        json.Chars.forEach( function( c ) {
          charmap[ c.GID ] = c;
        } );
    }
    
  } );
  /*
    R 0071 <charactor ID>.l <map name>.16B <ip>.l <port>.w
    キャラクタ選択成功&マップ名&ゲーム鯖IP/port
  */
  var charid;
  Capture.on( 'R0071', function( addr, port, len, buf ) {
    console.log( "R:0071", buf );
    var json = Capture.packet2json( buf, [ { k: 'CharId',  t: 'ulong' },
                                           { k: 'MapName', t: 'string', l: 16 },
                                           { k: 'MapIP',   l: 4,
                                             f: function( b ) {
                                               return sprintf( '%d.%d.%d.%d', b[0], b[1], b[2], b[3] );
                                             } },
                                           { k: 'MapPort', t: 'uint' } ] );
    charid = json.CharId;
    $("#id_map").empty().append( sprintf('%s (%s:%d)', json.MapName, json.MapIP, json.MapPort ) );
    $("#id_charname").empty().append( charmap[ charid ].Name );
    /*
    ( function( buf ) {
      var charid  = buf.slice( 0, 4 ).readUInt32LE();
      var mapname = buf.slice( 4, 4 + 16 ).toString();
      var mapip   = buf.slice( 4 + 16, 4 + 16 + 4 );
      var mapport = buf.slice( 4 + 16 + 4, 4 + 16 + 4 + 2 ).readUInt16LE();
      //console.log( "on packet:0071", { charid: charid, mapname: mapname, mapip: mapip, mapport: mapport } );
      
    } )( buf );
    */
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
