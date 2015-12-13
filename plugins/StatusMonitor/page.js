'use strict';

var remote = require('remote');
var BrowserWindow = remote.require('browser-window');

var jQuery;
var $ = jQuery = require('../lib/jquery-1.11.3.min.js');


/*
R 00b1 <type>.w <val>.l
	色々な能力値の更新。以下type:対応する数値を列挙
	0001:ベース側経験値 0002:ジョブ側経験値	0014:zeny
	0016:ベース側必要経験値 0017:ジョブ側必要経験値
	β1では00b0はvalがshort、00b1はvalがlongという使い分けがあったんだけど
	今となっては差が無くなって、盲腸みたいなもの?
*/
    
