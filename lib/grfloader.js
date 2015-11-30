var Iconv = require('iconv').Iconv;

var Grf = require('grf-extractor/lib/grf.js');
var Fs  = require('fs');

function GrfLoader() {
  var self = this;
  self.is_loaded = false;

  var conv = new Iconv( 'Shift-JIS', 'UTF-8//TRANSLIT//IGNORE' );
  var grf;
  self.init = function( grfpath, cb ) {
    Fs.open( grfpath, 'r', function( err, fd ) {
      if( err ) return cb( err );
      self.is_loaded = true;
      grf = new Grf( { fd: fd } );
      return cb();
    } );
  };
  self.getFile = function( filename, cb ) {
    filename = ( 'data/' + filename ).replace( /\//g, '\\' );
    var exists = grf.getFile( filename, function( data ) {
      var buf = new Buffer( new Uint8Array( data ) );
      return cb( null, buf );
    } );
    if( exists === false )
      return cb( 'file not found: ' + filename );
  };
  self.getTextFile = function( filename, cb ) {
    self.getFile( filename, function( err, data ) {
      if( err )
        return cb( err );
      return cb( null, conv.convert( data ).toString() )
    } );
  };
};

module.exports = new GrfLoader();
