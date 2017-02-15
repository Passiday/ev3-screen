var BitArray = require('node-bitarray')
var fs = require("fs");

var frameBufferFile = '/dev/fb0';
var frameBufferSize = 3072;

function BitMap(width, height) {
  var self = this;
  this.height = height;
  this.width = width;
  this.rowSize = Math.floor((this.width + 7) / 8) * 8; // For practical purposes, pixel rows have to multiples of 8
  this.pixels = BitArray.factory(0, this.rowSize * this.height);
  this.set = function(x, y, value) {
    // set pixel in (x, y) to value
    var index = x + this.rowSize * y;
    self.pixels.set(index, value);
  }
  this.get = function(x, y) {
    // get the pixel value in (x, y)
    var index = x + this.rowSize * y;
    return self.pixels.get(index);
  }
  this.place = function(bitmap, x, y, mode) {
    // place the bitmap in given coordinates (x, y).
    // mode parameter denotes the way how the bitmap pixel values are merged with the background:
    //   "normal" (default) - the placed bitmap values override the background values
    //   "and" - the placed bitmap values are merged with the background values using bitwise-AND
    //   "or" - the placed bitmap values are merged with the background values using bitwise-OR
    if (mode == "and") {
      // AND merge mode
      for (var by = 0; by < bitmap.height; by++) {
        for (var bx = 0; bx < bitmap.width; bx++) {
          var value = bitmap.get(bx, by);
          var bgvalue = value ? self.get(x + bx, y + by) : 0;
          self.set(x + bx, y + by, value & bgvalue);
        }
      }
    } else if (mode == "or") {
      // OR merge mode
      for (var by = 0; by < bitmap.height; by++) {
        for (var bx = 0; bx < bitmap.width; bx++) {
          var value = bitmap.get(bx, by);
          var bgvalue = !value ? self.get(x + bx, y + by) : 1;
          self.set(x + bx, y + by, value | bgvalue);
        }
      }
    } else {
      // normal merge mode
      for (var by = 0; by < bitmap.height; by++) {
        for (var bx = 0; bx < bitmap.width; bx++) {
          var value = bitmap.get(bx, by);
          self.set(x + bx, y + by, value);
        }
      }
    }

  }
}
BitMap.fromPBM = function(data) {
  // interpret the data as image data in PBM[P4] format, return new BitMap
  // PBM format reference: http://netpbm.sourceforge.net/doc/pbm.html
  var strData = "";
  if (data instanceof Buffer) {
    // Convert the byte stream to string. Uses deprecated 'binary' encoding.
    strData = data.toString('binary');
  } else {
    strData = data;
  }
  // Strip the comments
  strData = strData.replace(/([\n\r\t ]|^)#[^\n\r]*([\n\r]|$)/g, "$1");
  // Extract the components
  var parse = /^P4[\n\r\t ]+([0-9]+)[\n\r\t ]+([0-9]+)[\n\r\t ]+([\s\S]*)$/.exec(strData);
  //var parse = /^P4[\n\r\t ]+([0-9]+)/.exec(strData);
  if (!parse) return new Error("Bad PBM data");
  var width = parseInt(parse[1], 10);
  var height = parseInt(parse[2], 10);
  var pixelData = parse[3];
  console.log("width: " + width);
  console.log("height: " + height);
  console.log("data size: " + pixelData.length);
  // Create the array of octets
  var bm = new BitMap(width, height);
  var binaryData = new Buffer(pixelData, 'binary');
  var hexData = [];
  for (var i = 0; i < pixelData.length; i++) hexData.push(binaryData[i].toString(16));
  console.log("Binary data: " + hexData.join(", "));
  bm.pixels = BitArray.fromBuffer(binaryData);
  return bm;
}
BitMap.fromFile = function(path, callback) {
  // load a PBM format file from the given path
  fs.readFile(path, function(err, data) {
    if (err) {
      console.log(err);
      return;
    }
    var bitmap = BitMap.fromPBM(data);
    if (bitmap instanceof Error) {
      console.log(bitmap);
      return;
    }
    callback(bitmap);
  });
}
BitMap.fromShell = function(command, callback) {
  // load a PBM format file from shell command stdout
  // Warning: currently does not work properly, because 0x80+ values get corrupted
  var exec = require('child_process').exec;
  var child;

  child = exec(command, function (err, stdout, stderr) {
    if (err) {
        console.log(err);
        return;
    }
    var bitmap = BitMap.fromPBM(stdout);
    if (bitmap instanceof Error) {
      console.log(bitmap);
      return;
    }
    callback(bitmap);
  });
}

function Screen() {
  var self = this;
  this.bitmap = new BitMap(192, 128); // 1 row = 24 bytes = 192 bits
  var reverseBits = [
    0x00, 0x80, 0x40, 0xC0, 0x20, 0xA0, 0x60, 0xE0, 0x10, 0x90, 0x50, 0xD0, 0x30, 0xB0, 0x70, 0xF0,
    0x08, 0x88, 0x48, 0xC8, 0x28, 0xA8, 0x68, 0xE8, 0x18, 0x98, 0x58, 0xD8, 0x38, 0xB8, 0x78, 0xF8,
    0x04, 0x84, 0x44, 0xC4, 0x24, 0xA4, 0x64, 0xE4, 0x14, 0x94, 0x54, 0xD4, 0x34, 0xB4, 0x74, 0xF4,
    0x0C, 0x8C, 0x4C, 0xCC, 0x2C, 0xAC, 0x6C, 0xEC, 0x1C, 0x9C, 0x5C, 0xDC, 0x3C, 0xBC, 0x7C, 0xFC,
    0x02, 0x82, 0x42, 0xC2, 0x22, 0xA2, 0x62, 0xE2, 0x12, 0x92, 0x52, 0xD2, 0x32, 0xB2, 0x72, 0xF2,
    0x0A, 0x8A, 0x4A, 0xCA, 0x2A, 0xAA, 0x6A, 0xEA, 0x1A, 0x9A, 0x5A, 0xDA, 0x3A, 0xBA, 0x7A, 0xFA,
    0x06, 0x86, 0x46, 0xC6, 0x26, 0xA6, 0x66, 0xE6, 0x16, 0x96, 0x56, 0xD6, 0x36, 0xB6, 0x76, 0xF6,
    0x0E, 0x8E, 0x4E, 0xCE, 0x2E, 0xAE, 0x6E, 0xEE, 0x1E, 0x9E, 0x5E, 0xDE, 0x3E, 0xBE, 0x7E, 0xFE,
    0x01, 0x81, 0x41, 0xC1, 0x21, 0xA1, 0x61, 0xE1, 0x11, 0x91, 0x51, 0xD1, 0x31, 0xB1, 0x71, 0xF1,
    0x09, 0x89, 0x49, 0xC9, 0x29, 0xA9, 0x69, 0xE9, 0x19, 0x99, 0x59, 0xD9, 0x39, 0xB9, 0x79, 0xF9,
    0x05, 0x85, 0x45, 0xC5, 0x25, 0xA5, 0x65, 0xE5, 0x15, 0x95, 0x55, 0xD5, 0x35, 0xB5, 0x75, 0xF5,
    0x0D, 0x8D, 0x4D, 0xCD, 0x2D, 0xAD, 0x6D, 0xED, 0x1D, 0x9D, 0x5D, 0xDD, 0x3D, 0xBD, 0x7D, 0xFD,
    0x03, 0x83, 0x43, 0xC3, 0x23, 0xA3, 0x63, 0xE3, 0x13, 0x93, 0x53, 0xD3, 0x33, 0xB3, 0x73, 0xF3,
    0x0B, 0x8B, 0x4B, 0xCB, 0x2B, 0xAB, 0x6B, 0xEB, 0x1B, 0x9B, 0x5B, 0xDB, 0x3B, 0xBB, 0x7B, 0xFB,
    0x07, 0x87, 0x47, 0xC7, 0x27, 0xA7, 0x67, 0xE7, 0x17, 0x97, 0x57, 0xD7, 0x37, 0xB7, 0x77, 0xF7,
    0x0F, 0x8F, 0x4F, 0xCF, 0x2F, 0xAF, 0x6F, 0xEF, 0x1F, 0x9F, 0x5F, 0xDF, 0x3F, 0xBF, 0x7F, 0xFF
  ];
  //fs.open(frameBufferFile, "w",
  this.clear = function(refresh) {
    // Clear the screen contents. If refresh == true, then refresh the screen
    self.bitmap.pixels.reset();
    if (refresh) self.draw();
  }
  this.draw = function() {
    // Output the contents of this.bitmap to the EV3 LCD screen
    // ev3dev LCD screen reference: http://www.ev3dev.org/docs/tutorials/using-ev3-lcd
    var buffer = self.bitmap.pixels.toBuffer();
    // The screen shows the least-signifficant bits first, so the bit order in each byte must be reversed
    for (var i = 0; i < 3072; i++) buffer[i] = reverseBits[buffer[i]];
    // Write to the framebuffer
    fs.writeFileSync(frameBufferFile, buffer);
  }
}

module.exports = {
  BitMap : BitMap,
  Screen : Screen
}
