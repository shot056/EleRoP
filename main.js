'use strict';

var app           = require('app');
var BrowserWindow = require('browser-window');
var Menu          = require('menu');
var fs            = require('fs');

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
  loadPlugins( function( err, plugins ) {
    Capture.init( function( err ) {
      if( err ) throw err;
      Config.init( plugins, function( err, is_config_ok ) {
        if( !is_config_ok )
          Config.show();
        else
          Capture.startCapture( Config.get( "device" ) );
      } );
    } );
  } );
} );

function loadPlugins( cb ) {
  fs.readdir( __dirname + '/plugins/', function( err, names ) {
    if( err ) return cb( err );
    Promise.all( names.map( function( name ) {
      return new Promise( function( resolve, reject ) {
        fs.stat( __dirname + '/plugins/' + name, function( err, b_stats ) {
          if( err ) return reject( err );
          if( b_stats.isDirectory() )
            fs.stat( __dirname + '/plugins/' + name + '/index.js', function( err, i_stats ) {
              if( err ) return reject( err );
              if( i_stats.isFile() )
                return resolve( require( __dirname + '/plugins/' + name + '/index.js' ) );
              else
                return resolve();
            } );
          else
            return resolve();
        } );
      } );
    } ) ).then( function( results ) {
      var plugins = {};
      results.forEach( function( x, i ) {
        plugins[ x.id ] = x;
      } );
      return cb( null, plugins );
    } ).catch( function( err ) {
      return cb( err );
    } );
  } );
}

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
