'use strict';

var sprintf = require('sprintf').sprintf;
var fs      = require('fs');
var iconv   = require('iconv');

var EventEmitter = require('events').EventEmitter;

var Cap = require('cap').Cap,
decoders = require('cap').decoders,
PROTOCOL = decoders.PROTOCOL;

function Capture() {
  var self = this;

  var conv = new iconv.Iconv( 'Shift-JIS', 'UTF-8//TRANSLIT//IGNORE' );
  
  self.is_connected = false;
  self.capture_addr = '';

  var packetLength = {};
  self.init = function( cb ) {
    var packetLengthFile = __dirname + '/../PacketLength.txt';
    fs.exists( packetLengthFile, function( exists ) {
      if( ! exists )
        return cb( new Error( packetLengthFile + " not found" ) );
      
      fs.readFile( packetLengthFile, function( err, data ) {
        var packetCounter = 0;
        data.toString().split("\r\n").forEach( function( line ) {
          if( ! line.match( /^#/ ) ) {
            var nline = line.replace(/ /g,"" );
            nline.split(",").forEach( function( n ) {
              if( n.length > 0 ) {
                packetLength[ sprintf('%04s', packetCounter.toString( 16 ) ).toLowerCase() ] = parseInt( n, 10 );
                packetCounter += 1;
              }
            } );
          }
        } );
        cb();
      } );
    } );
  };
  var packetEv = new EventEmitter();

  self.on = function( ename, cb ) {
    packetEv.on( ename, cb );
  };
  var last_addr;
  var last_port;
  var packet_buffer;
  function parsePacket( addr, port, buf ) {
    if( last_addr != addr && last_port != port ) {
      last_addr = addr;
      last_port = port;
      packet_buffer = new Buffer("");
    }
    packet_buffer = Buffer.concat( [ packet_buffer, buf ] );
    var flg = true;
    while( flg ) {
      ( function() {
        var ptype = sprintf( "%02s%02s", packet_buffer[1].toString( 16 ), packet_buffer[0].toString( 16 ) ).toLowerCase();
        console.log( { ptype: ptype } );
        if( ( ptype in packetLength ) ) {
          if( packetLength[ ptype ] != -1 ) {
            if( packet_buffer.byteLength >= packetLength[ ptype ] ) {
              ( function( addr, port, ptype, len, sendbuf ) {
                process.nextTick( function() {
                  packetEv.emit( 'R'+ptype, addr, port, packetLength[ ptype ], sendbuf );
                } );
              } )( addr, port, ptype, packetLength[ ptype ] - 2, packet_buffer.slice( 2, packetLength[ ptype ] ) );
              packet_buffer = packet_buffer.slice( packetLength[ ptype ], packet_buffer.byteLength );
            }
            else
              flg = false;
          }
          else if( packet_buffer.byteLength < 4 )
            flg = false;
          else {
            var len = packet_buffer.slice( 2, 2 + 2 ).readUInt16LE();
            if( packet_buffer.byteLength >= len ) {
              ( function( addr, port, ptype, len, sendbuf ) {
                process.nextTick( function() {
                  packetEv.emit( 'R'+ptype, addr, port, len, sendbuf );
                } );
              } )( addr, port, ptype, len - 4, packet_buffer.slice( 2 + 2, len ) );
              packet_buffer = packet_buffer.slice( len, packet_buffer.byteLength );
            }
            else
              flg = false;
          }
        }
        else {
          console.warn( "unknown packet : ", packet_buffer );
          packet_buffer = new Buffer("");
          flg = false;
        }
        if( packet_buffer.byteLength < 2 )
          flg = false;
      } )();
    }
  }
  var readTypes = {
    'uint32':  function( b, s ) { return b.readUInt32LE() },
    'int32':   function( b, s ) { return b.readInt32LE() },
    'uint16':   function( b, s ) { return b.readUInt16LE() },
    'int16':    function( b, s ) { return b.readInt16LE() },
    'uint8': function( b, s ) { return b.readUInt8() },
    'int8':  function( b, s ) { return b.readInt8() },
    'string': function( b, s ) { return conv.convert( b ).toString().replace(/\u0000+/,'') },
    //'string': function( b, s ) { return b.toString() },
    'loop':   function( b, s ) {
      var idx = 0;
      var ret = [];
      for( var i = 0; i < s.c; i ++ ) {
        var line = {};
        s.s.forEach( function( x ) {
          if( typeof x.f == 'function' ) {
            line[ x.k ] = x.f( b.slice( idx, idx + x.l ) );
            idx = idx + x.l;
          }
          else
            ( function() {
              var len = readLength[ x.t ]( x );
              line[ x.k ] = readTypes[ x.t ]( b.slice( idx, idx + len ), x );
              idx = idx + len;
            } )();
        } );
        ret[ i ] = line;
      }
      return ret;
    }
  };
  var readLength = {
    'uint32':  function( s ) { return 4 },
    'int32':   function( s ) { return 4 },
    'uint16':   function( s ) { return 2 },
    'int16':    function( s ) { return 2 },
    'uint8': function( s ) { return 1 },
    'int8':  function( s ) { return 1 },
    'string': function( s ) { return s.l },
    'loop':   function( s ) {
      var len = 0;
      var onelen = 0;
      s.s.forEach( function( x, j ) {
        if( typeof x.f == 'function' )
          onelen += x.l;
        else
          onelen += readLength[ x.t ]( x );
      } );
      return onelen * s.c;
    }
  }
  self.packet2json = function( buf, structure ) {
    var idx = 0;
    var ret = {};
    structure.forEach( function( x ) {
      if( typeof x.f == 'function' ) {
        ret[ x.k ] = x.f( buf.slice( idx, idx + x.l ) );
        idx = idx + x.l;
      }
      else
        ( function() {
          var len = readLength[ x.t ]( x );
          ret[ x.k ] = readTypes[ x.t ]( buf.slice( idx, idx + len ), x );
          idx = idx + len;
        } )();
    } );
    return ret;
  }
  self.getDeviceList = function() { return Cap.deviceList() };
  self.startCapture = function( dip ) {
    console.log( "start capture : " + dip );
    var c = new Cap(),
    device = Cap.findDevice( dip ),
    filter = 'tcp src port 6900 or tcp src port 6121 or tcp src port 5121 or tcp src port 5122',
    bufSize = 10 * 1024 * 1024,
    buffer = new Buffer( 65535 );
    
    var linkType = c.open( device, filter, bufSize, buffer );
    
    c.setMinBytes && c.setMinBytes( 0 );
    
    c.on('packet', function( nbytes, trunc ) {
      //console.log( 'packet: length ' + nbytes + ' bytes, truncated? ' + ( trunc ? 'yes' : 'no' ) );
      if( linkType === 'ETHERNET' ) {
        var retEther = decoders.Ethernet( buffer );
        //console.log( { "ethernet ret": retEther } );
        
        if( retEther.info.type === PROTOCOL.ETHERNET.IPV4 ) {
          //console.log( 'Decoding IPv4' );
          
          var retIpv4 = decoders.IPV4( buffer, retEther.offset );
          //console.log( 'from: ' + retIpv4.info.srcaddr + ' to: ' + retIpv4.info.dstaddr );
          //console.log( { "ipv4 ret": retIpv4 } );

          if( retIpv4.info.protocol === PROTOCOL.IP.TCP ) {
            var datalen = retIpv4.info.totallen - retIpv4.hdrlen;
            
            //console.log( 'Decoding TCP ...' );
            var retTcp = decoders.TCP( buffer, retIpv4.offset );

            //console.log( ' from port: ' + retTcp.info.srcport + ' to port: ' + retTcp.info.dstport );
            //console.log( { 'tcp ret': retTcp } );
            datalen -= retTcp.hdrlen;
            if( datalen > 0 )
              parsePacket( retIpv4.info.srcaddr, retTcp.info.srcport, buffer.slice( retTcp.offset, retTcp.offset + datalen ) );
            //packetEv.emit( 'packet', retIpv4.info.srcaddr, retTcp.info.srcport, buffer.slice( retTcp.offset, retTcp.offset + datalen ) );
            //console.log( { buffer: buffer.toString( 'binary', retTcp.offset, retTcp.offset + datalen ) } );
          }
        }
      }
    } );
    self.is_connected = true;
    self.capture_addr = dip
    packetEv.emit( 'connected', true, dip );
  }
  function isRoLoginServer( ipaddr, port ) {
    if( port === 6900 )
      return true;
    return false;
  }
  function isRoCharServer( ipaddr, port ) {
    if( port === 6121 )
      return true;
    return false;
  }
  function isRoMapServer( ipaddr, port ) {
    if( port === 5121 || port === 5122 )
      return true;
    return false;
  }
};


module.exports = new Capture();
