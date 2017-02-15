var ev3_screen = require("./");
var scr = new ev3_screen.Screen();
var BitMap = ev3_screen.BitMap;

// some code for measuring the timing
var debugMode = true;
var timerStart;
function timerGo() {
  timerStart = new Date().getTime();
}
function timerTouch(label) {
  var timerEnd = new Date().getTime();
  var timerDuration = timerEnd - timerStart;
  if (debugMode) console.log("Timer[" + label + "]: " + timerDuration);
  timerStart = timerEnd;
}

// Example 1: set pixel values directly
function example1(then) {
  function rectangle(bitmap, x1, y1, x2, y2) {
    var x, y, t;
    x1 = Math.round(x1);
    x2 = Math.round(x2);
    y1 = Math.round(y1);
    y2 = Math.round(y2);
    if (x2 < x1) {t = x2; x2 = x1; x1 = x2}
    if (y2 < y1) {t = y2; y2 = y1; y1 = y2}
    for (x = x1; x <= x2; x++) {
      bitmap.set(x, y1, 1);
      bitmap.set(x, y2, 1);
    }
    for (y = y1 + 1; y < y2; y++) {
      bitmap.set(x1, y, 1);
      bitmap.set(x2, y, 1);
    }
  }

  for (var i = 0; i < 32; i++) {
    rectangle(scr.bitmap, i * 2.78, i * 2, 178 - i * 2.78 - 1, 128 - i * 2 - 1);
  }
  timerTouch("Graphics");

  scr.draw();
  timerTouch("Screen");
  then();
}

// Example 2: load image from file and place it in specific coordinates
function example2(then) {
  BitMap.fromFile(__dirname + '/test.pbm', function(bmp) {
    timerTouch("Bitmap load");
    scr.bitmap.place(bmp, 53, 28);
    timerTouch("Bitmap place");
    scr.draw();
    timerTouch("Screen");
    then();
  });
}

// Example 3: create and display the image using ImageMagick (IM has to be installed)
function example3(then) {
  var cmd = "convert -font Droid-Serif-Bold -pointsize 22 label:A pbm:-"
  BitMap.fromShell(cmd, function(bmp) {
    timerTouch("Bitmap load");
    scr.bitmap.place(bmp, 10, 34);
    timerTouch("Bitmap place");
    scr.draw();
    timerTouch("Screen");
    then();
  })
}

function wait() {
  setTimeout(function(){}, 5000);
}

timerGo();
example2(wait);
