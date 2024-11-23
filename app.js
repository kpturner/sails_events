'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const Utility = require('./api/services/Utility');
process.chdir(__dirname);
let sails;
(function () {
  try {
    sails = require('sails');
  } catch (e) {
    console.error(
      'To run an app using `node app.js`, you usually need to have a version of `sails` installed in the same directory as your app.'
    );
    console.error('To do that, run `npm install sails`');
    console.error('');
    console.error(
      'Alternatively, if you have sails installed globally (i.e. you did `npm install -g sails`), you can use `sails lift`.'
    );
    console.error(
      'When you run `sails lift`, your app will still use a local `./node_modules/sails` dependency if it exists,'
    );
    console.error("but if it doesn't, the app will run with the global sails instead!");
    return;
  }
  let rc;
  try {
    rc = require('rc');
  } catch (e0) {
    try {
      rc = require('sails/node_modules/rc');
    } catch (e1) {
      console.error('Could not find dependency: `rc`.');
      console.error('Your `.sailsrc` file(s) will be ignored.');
      console.error('To resolve this, run:');
      console.error('npm install rc --save');
      rc = function () {
        return {};
      };
    }
  }
  sails.lift(rc('sails'));
})();
process.on('uncaughtException', function (err) {
  try {
    const msg = `uncaughtException: ${err.message} <br> ${err.stack}`;
    console.log(msg);
    if (sails && Utility) {
      sails.log.error('uncaughtException:', err.message);
      sails.log.error(err.stack);
      if (msg.indexOf('Redis connection to events-redis:6379 failed') < 0) {
        Utility.diagnosticEmail(msg, 'Application crash', function () {
          process.exit(1);
        });
      }
      setTimeout(function () {
        process.exit(1);
      }, 5000);
    } else {
      process.exit(1);
    }
  } catch (e) {
    if (sails) {
      sails.log.error('Error handling uncaught exception');
      sails.log.error(e);
    } else {
      console.log('Error handling uncaught exception');
      console.log(e);
    }
    process.exit(1);
  }
});
//# sourceMappingURL=app.js.map
