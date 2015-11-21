'use strict';

var fs = require('fs');


function Config() {
  var self = this;
  var configfile = 'config.json';
  var defaultConfig = {
    is_default: true
  };
  var _config = JSON.parse( JSON.stringify( defaultConfig ) );
  self.get = function( name, defaultVal ) {
    if( !( name in _config ) && defaultVal ) _config[ name ] = defaultVal;
    if( ( name in _config ) ) return _config[ name ];
    return null;
  };
  self.set = function( name, value ) {
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
