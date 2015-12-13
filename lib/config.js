'use strict';

var BrowserWindow = require('browser-window');
var dialog        = require('dialog');

var fs  = require('fs');
var Grf = require('./grfloader');


function Config() {
  var self = this;
  var configfile = 'config.json';
  var defaultConfig = {
    is_default: true
  };
  self.plugins = [];
  
  var _config = JSON.parse( JSON.stringify( defaultConfig ) );
  self.get = function( name, defaultVal ) {
    if( !( name in _config ) && defaultVal ) _config[ name ] = defaultVal;
    if( ( name in _config ) ) return _config[ name ];
    return null;
  };
  self.set = function( name, value ) {
    console.log( "config->set: ", name, value );
    return _config[ name ] = value;
  }
  self.load = function( cb ) {
    console.log( "load file: " + configfile );
    fs.exists( configfile, function( exists ) {
      if( exists )
        fs.readFile( configfile, function( err, data ) {
          try {
            _config = JSON.parse( data );
            return cb();
          }
          catch( e ) {
            return cb( e );
          }
        } );
      else
        return cb();
    } );
  };
  self.init = function( plugins, cb ) {
    self.plugins = plugins;
    self.load( function( err ) {
      if( err ) throw err;
      var is_config_ok = true;
      if( self.get("is_default") ) {
        dialog.showErrorBox( 'エラー', '初期設定を行ってください' );
        cb( null, false );
      } else {
        if( !self.get( "device" ) ) {
          is_config_ok = false;
          dialog.showErrorBox( 'エラー', 'キャプチャするデバイスを選択してください。' );
        }
        if( !self.get("ro-path" ) ) {
          is_config_ok = false;
          dialog.showErrorBox( 'エラー', 'ROのインストール先を選択してください。' );
        }
        if( is_config_ok )
          Grf.init( self.get("ro-path") + "\\data.grf", function( err ) {
            if( err ) {
              is_config_ok = false;
              dialog.showErrorBox( 'エラー', 'ROのインストール先を選択してください。' );
            }
            cb( null, is_config_ok );
          } );
        else
          cb( null, is_config_ok );
      }
    } );
  };
  self.show = function() {
    var configWindow = new BrowserWindow( { width: 800, height: 600, resizable: false, autoHideMenuBar: true } );
    configWindow.loadURL( 'file://' + __dirname + '/..//pages/config/index.html' );
    configWindow.on( 'closed', function() {
      configWindow = null;
    } );
    configWindow.show();
  };
  
  self.save = function( cb ) {
    console.log( "save file: " + configfile );
    delete _config.is_default;
    fs.writeFile( configfile, JSON.stringify( _config, null, "  " ), function( err ) {
      if( err ) return cb( err );
      return cb();
    } )
  }
};

module.exports = new Config();
