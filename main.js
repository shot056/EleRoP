'use strict';

var app           = require('app');
var BrowserWindow = require('browser-window');
var Menu          = require('menu');

var Capture = require('./lib/capture');
var Config  = require('./lib/config');

require('crash-reporter').start();

var mainWindow = null;


app.on( 'window-all-closed', function() {
  app.quit();
} );

app.on( 'ready', function() {
  
  Menu.setApplicationMenu( menu );
  
  mainWindow = new BrowserWindow( {
    width: 300, height: 150,
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
      if( Config.get("is_default") || !Config.get( "device" ) ) {
        var configWindow = new BrowserWindow( { width: 800, height: 600, resizable: false, autoHideMenuBar: true } );
        configWindow.loadURL( 'file://' + __dirname + '/pages/config/index.html' );
        configWindow.on( 'closed', function() {
          configWindow = null;
        } );
        configWindow.show();
      }
      else
        Capture.startCapture( Config.get( "device" ) );
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
