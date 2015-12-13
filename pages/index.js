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
    //console.log( "R:099d", buf );
    if( len > 0 ) {
      var json = Capture.packet2json( buf, [ { k: 'Chars', t: 'loop', c: 3, s: [ { k: 'GID',         t: 'uint32' },
                                                                                 { k: 'Exp',         t: 'int32' },
                                                                                 { k: 'Money',       t: 'int32' },
                                                                                 { k: 'JobExp',      t: 'int32' },
                                                                                 { k: 'JobLv',       t: 'int32' },
                                                                                 { k: 'bState',      t: 'int32' },
                                                                                 { k: 'hState',      t: 'int32' },
                                                                                 { k: 'eState',      t: 'int32' },
                                                                                 { k: 'Virtue',      t: 'int32' },
                                                                                 { k: 'Honor',       t: 'int32' },
                                                                                 { k: 'JobPoint',    t: 'int16' },
                                                                                 { k: 'HP',          t: 'int32' }, //
                                                                                 { k: 'MaxHP',       t: 'int32' }, //
                                                                                 { k: 'SP',          t: 'int16' },
                                                                                 { k: 'MaxSP',       t: 'int16' },
                                                                                 { k: 'Speed',       t: 'int16' },
                                                                                 { k: 'Job',         t: 'int16' },
                                                                                 { k: 'Head',        t: 'int16' },
                                                                                 { k: 'Weapon',      t: 'int32' }, //
                                                                                 { k: 'Lv',          t: 'int16' },
                                                                                 { k: 'SpPoint',     t: 'int16' },
                                                                                 { k: 'Accessory',   t: 'int16' },
                                                                                 { k: 'Shield',      t: 'int16' },
                                                                                 { k: 'Accessory2',  t: 'int16' },
                                                                                 { k: 'Accessory3',  t: 'int16' },
                                                                                 { k: 'HeadPalette', t: 'int16' },
                                                                                 { k: 'BodyPalette', t: 'int16' },
                                                                                 { k: 'Name',        t: 'string', l: 24 },
                                                                                 { k: 'Str',         t: 'uint8' },
                                                                                 { k: 'Agi',         t: 'uint8' },
                                                                                 { k: 'Vit',         t: 'uint8' },
                                                                                 { k: 'int16',         t: 'uint8' },
                                                                                 { k: 'Dex',         t: 'uint8' },
                                                                                 { k: 'Luk',         t: 'uint8' },
                                                                                 { k: 'CharNum',     t: 'uint8' },
                                                                                 { k: 'HairColor',   t: 'uint8' },
                                                                                 { k: 'bIsChangedCharName', t: 'int16' },
                                                                                 { k: 'lastMap',     t: 'string', l: 16 },
                                                                                 { k: 'DeleteDate',  t: 'int32' },
                                                                                 { k: 'Robe',        t: 'int32' },
                                                                                 { k: 'SlotAddon',   t: 'int32' },
                                                                                 { k: 'RenameAddon', t: 'int32' },
                                                                                 { k: 'Sex',         t: 'uint8' } ] } ] );
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
    //console.log( "R:0071", buf );
    var json = Capture.packet2json( buf, [ { k: 'CharId',  t: 'uint32' },
                                           { k: 'MapName', t: 'string', l: 16 },
                                           { k: 'MapIP',   l: 4,
                                             f: function( b ) {
                                               return sprintf( '%d.%d.%d.%d', b[3], b[2], b[1], b[0] );
                                             } },
                                           { k: 'MapPort', t: 'uint16' } ] );
    charid = json.CharId;
    $("#id_map").empty().append( sprintf('%s', map_name_table[ json.MapName ] || json.MapName ) );
    $("#id_charname").empty().append( charmap[ charid ].Name );
  } );
  /*
    R 0086 <ID>.l <X_Y_X_Y>.5B <?>.B <server_tick>.l
	移動情報
  */
  /*
  Capture.on( 'R0086', function( addr, port, len, buf ) {
    var json = Capture.packet2json( buf, [ { k: 'id', t: 'uint32' },
                                           { k: 'a', t: 'uint8' },
                                           { k: 'b', t: 'uint8' },
                                           { k: 'c', t: 'uint8' },
                                           { k: 'd', t: 'uint8' },
                                           { k: 'e', t: 'uint8' },
                                           { k: '?', t: 'uint8' },
                                           { k: 'tick', t: 'int32' } ] );
    console.log( JSON.stringify( { 'R0086': json } ) );
  } );
  */
  /*
    R 0087 <server tick>.l <X_Y_X_Y>.5B ?(0固定).B
	移動応答
  */
  /*
  Capture.on( 'R0087', function( addr, port, len, buf ) {
    console.log( JSON.stringify( { 'R0087-1': [ 0,1,2,3,4,5,6,7,8,9 ].map( function( i ) { return sprintf( '%3d', buf.slice( i, i + 1 ).readInt8() ) } ),
                                   'R0087-1': [ 0,1,2,3,4,5,6,7,8,9 ].map( function( i ) { return sprintf( '%3d', buf.slice( i, i + 1 ).readUInt8() ) } ) } ) );
    // console.log( { 'R0087': buf } );
    // var json = Capture.packet2json( buf, [ { k: 'tick', t: 'int32' },
    //                                        { k: 'a', t: 'uint8' },
    //                                        { k: 'b', t: 'uint8' },
    //                                        { k: 'c', t: 'uint8' },
    //                                        { k: 'd', t: 'uint8' },
    //                                        { k: 'e', t: 'uint8' },
    //                                        { k: '?', t: 'uint8' } ] );
    // console.log( JSON.stringify( { 'R0087': json } ) );
  } );
  */
  /*
    R 0088 <ID>.l <X>.w <Y>.w
	移動途中停止
  */
  /*
  Capture.on( 'R0088', function( addr, port, len, buf ) {
    var json = Capture.packet2json( buf, [ { k: 'id', t: 'uint32' },
                                           { k: 'x',  t: 'uint8' },
                                           { k: 'y',  t: 'uint8' } ] );
    console.log( JSON.stringify( { 'R0088': json } ) );
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
