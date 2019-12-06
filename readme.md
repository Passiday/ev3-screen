# ev3dev-screen
Output to the LCD screen of Lego Mindstorms EV3 brick, running ev3dev firmware.
=========================================================

How to install:
---------------

Currently the package is not registered in npm, so just download this
set of files and put it is an ev3-screen subfolder of your node_modules folder.

Testing:
--------

Edit the test.js file, then run in a new virtual terminal:
```
sudo openvt -s -w -- sudo --user <user> -- nodejs test.js
```
