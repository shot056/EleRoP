'use strict';

var app           = require('app');
var BrowserWindow = require('browser-window');
var Menu          = require('menu');
var dialog        = require('dialog');

var Capture = require('./lib/capture');
var Config  = require('./lib/config');
var Grf     = require('./lib/grfloader');

require('crash-reporter').start();

var mainWindow = null;


app.on( 'window-all-closed', function() {
  app.quit();
} );

app.on( 'ready', function() {
  
  Menu.setApplicationMenu( menu );
  
  mainWindow = new BrowserWindow( {
    width: 400, height: 150,
    resizable: false,
    autoHideMenuBar: true
  } );
  mainWindow.loadURL('file://' + __dirname + '/pages/index.html' );

  mainWindow.on('closed', function() {
    mainWindow = null;
  } );
  Capture.init( function( err ) {
    if( err ) throw err;
    Config.load( function( err ) {
      if( err ) throw err;
      var is_config_ok = true;
      if( Config.get("is_default") ) {
        is_config_ok = false;
        dialog.showErrorBox( 'エラー', '初期設定を行ってください' );
        cb();
      } else {
        if( !Config.get( "device" ) ) {
          is_config_ok = false;
          dialog.showErrorBox( 'エラー', 'キャプチャするデバイスを選択してください。' );
        }
        if( !Config.get("ro-path" ) ) {
          is_config_ok = false;
          dialog.showErrorBox( 'エラー', 'ROのインストール先を選択してください。' );
        }
        if( is_config_ok )
          Grf.init( Config.get("ro-path") + "\\data.grf", function( err ) {
            if( err ) {
              is_config_ok = false;
              dialog.showErrorBox( 'エラー', 'ROのインストール先を選択してください。' );
            }
            cb();
          } );
        else
          cb();
      }
      
      function cb() {
        if( !is_config_ok ) {
          var configWindow = new BrowserWindow( { width: 800, height: 600, resizable: false, autoHideMenuBar: true } );
          configWindow.loadURL( 'file://' + __dirname + '/pages/config/index.html' );
          configWindow.on( 'closed', function() {
            configWindow = null;
          } );
          configWindow.show();
        }
        else
          Capture.startCapture( Config.get( "device" ) );
      }
    } );
  } );
} );


var menuConfig = [
  {
    label: 'Toggle Developer Tools',
    accelerator: (function() {
      if (process.platform == 'darwin')
        return 'Alt+Command+I';
      else
        return 'Ctrl+Shift+I';
    })(),
    click: function(item, focusedWindow) {
      if (focusedWindow)
        focusedWindow.toggleDevTools();
    }
  }
];

var menu = Menu.buildFromTemplate( menuConfig );
