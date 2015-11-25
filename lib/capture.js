'use strict';

var sprintf = require('sprintf').sprintf;
var fs      = require('fs');

var EventEmitter = require('events').EventEmitter;

var Cap = require('cap').Cap,
decoders = require('cap').decoders,
PROTOCOL = decoders.PROTOCOL;

function Capture() {
  var self = this;

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

  packetEv.on( 'packet', function( addr, port, buf ) {
    if( buf.length > 0 ) {
      ( function() {
        var ptype = sprintf( "%02s%02s", buf[1].toString(16), buf[0].toString(16) ).toLowerCase();
        console.log( { ptype: ptype, len: packetLength[ ptype ], buf: buf.slice( 2, buf.length ) } );
        if( ( ptype in packetLength ) )
          packetEv.emit( 'packet_' + ptype, packetLength[ ptype ], buf.slice( 2, buf.length ) );
        else
          console.warn( "unknown packet: " + ptype + " : ", buf );
      } )();
    }
  } );
  self.on = function( ename, cb ) {
    packetEv.on( ename, cb );
  };
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
              packetEv.emit( 'packet', retIpv4.info.srcaddr, retTcp.info.srcport, buffer.slice( retTcp.offset, retTcp.offset + datalen ) );
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
