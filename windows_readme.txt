To install on Windows at the time of writing (Jan 2016) you will need:
node 4.2.6 or above
redis:   https://github.com/MSOpenTech/redis/releases

node-gyp needs to work on windows so the instructions can be found here: https://github.com/nodejs/node-gyp
Firstly (from a command prompt run as administrator): "npm install -g node-gyp"
Then follow the instructions under the heading "On Windows" using option 2 (install tools and configure manually)

Summary
=======

Visual C++ Build Environment:

Install Visual C++ Build Tools using the Default Install option.

Install Python 2.7 (v3.x.x is not supported), and run npm config set python python2.7 (or see below for further instructions on specifying the proper Python version and path.)

Launch cmd, "npm config set msvs_version 2015"

Then
====
Navigate to the folder containing this file in a cmd prompt and then run "npm install"

A useful resource:  https://github.com/Microsoft/nodejs-guidelines

I also ran into an error using redis:  "MISCONF Redis is configured to save RDB snapshots, but is currently not able to persist on disk."

To fix that I ran c:\program files\redis\redis-cli
then
config set stop-writes-on-bgsave-error no
Not a solution but a workaround