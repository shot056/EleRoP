'use strict';
var sprintf = require('sprintf').sprintf;
var remote = require('remote');
var BrowserWindow = remote.require('browser-window');
var jQuery;
var $ = jQuery = require('../lib/jquery-1.11.3.min.js');

$( function() {
  var Capture = remote.require('./lib/capture');
  var GRF     = remote.require('./lib/grfloader');

  var map_name_table = {};
  GRF.getTextFile( 'mapnametable.txt', function( err, data ) {
    data.split(/\r?\n/).forEach( function( l ) {
      if( l.length > 0 && !l.match(/^\/\//) ) {
        var sp = l.split('#');
        map_name_table[ sp[0] ] = sp[1];
        map_name_table[ sp[0].replace(/\.rsw$/, '.gat') ] = sp[1];
      }
    } );
  } );
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
                                               return sprintf( '%d.%d.%d.%d', b[3], b[2], b[1], b[0] );
                                             } },
                                           { k: 'MapPort', t: 'uint' } ] );
    charid = json.CharId;
    $("#id_map").empty().append( sprintf('%s', map_name_table[ json.MapName ] || json.MapName ) );
    $("#id_charname").empty().append( charmap[ charid ].Name );
  } );
  /*
    R 0086 <ID>.l <X_Y_X_Y>.5B <?>.B <server_tick>.l
	移動情報
  */
  Capture.on( 'R0086', function( addr, port, len, buf ) {
    var json = Capture.packet2json( buf, [ { k: 'id', t: 'ulong' },
                                           { k: 'a', t: 'ushort' },
                                           { k: 'b', t: 'ushort' },
                                           { k: 'c', t: 'ushort' },
                                           { k: 'd', t: 'ushort' },
                                           { k: 'e', t: 'ushort' },
                                           { k: '?', t: 'ushort' },
                                           { k: 'tick', t: 'long' } ] );
    console.log( JSON.stringify( { 'R0086': json } ) );
  } );
  /*
    R 0087 <server tick>.l <X_Y_X_Y>.5B ?(0固定).B
	移動応答
  */
  Capture.on( 'R0087', function( addr, port, len, buf ) {
    console.log( { 'R0087': buf } );
    var json = Capture.packet2json( buf, [ { k: 'tick', t: 'long' },
                                           { k: 'a', t: 'ushort' },
                                           { k: 'b', t: 'ushort' },
                                           { k: 'c', t: 'ushort' },
                                           { k: 'd', t: 'ushort' },
                                           { k: 'e', t: 'ushort' },
                                           { k: '?', t: 'ushort' } ] );
    console.log( JSON.stringify( { 'R0087': json } ) );
  } );
  /*
    R 0088 <ID>.l <X>.w <Y>.w
	移動途中停止
  */
  Capture.on( 'R0088', function( addr, port, len, buf ) {
    var json = Capture.packet2json( buf, [ { k: 'id', t: 'ulong' },
                                           { k: 'x',  t: 'ushort' },
                                           { k: 'y',  t: 'ushort' } ] );
    console.log( JSON.stringify( { 'R0088': json } ) );
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
