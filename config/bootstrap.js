/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.bootstrap.html
 */

module.exports.bootstrap = function (cb) {
  // Load the passport strategies
  sails.services.passport.loadStrategies();

  sails.on('lifted', function () {
    // Memory leak testing?
    if (sails.config.heapdumpInterval) {
      Utility.memoryLeakCheck();
    }

    //Utility.diagnosticEmail("Provincial events app started OK","Developers Paranoia!");

    sails.log.debug(`MySql host: ${sails.config.connections.localhostMysqlServer.host}`);
    sails.log.debug(`MySql database: ${sails.config.connections.localhostMysqlServer.database}`);

    // Build indexes asyncronously if need before
    if (sails.config.models.migrate == 'alter') {
      // Asynchronously build any indexes required for this environment
      Utility.buildIndexes(sails.config.connections.localhostMysqlServer.database, function () {
        sails.log.debug('indexes rebuilt');
      });
    } else {
      // Build database (who cares if it already exists)
      require('child_process').exec(
        `mysql --default-auth=mysql_native_password --host="${sails.config.connections.localhostMysqlServer.host}" --user="${sails.config.connections.localhostMysqlServer.user}" --password="${sails.config.connections.localhostMysqlServer.password}" --database="${sails.config.connections.localhostMysqlServer.database}" < ${__dirname}/../sql/db.sql`,
        function (err, stdout, stderr) {
          if (err) {
            sails.log.error('Error occurred creating the database - but it probably is just that it aready exists!');
            sails.log.error('Here is the error anyway: "' + err + '"');
            sails.log.info('stdout: ' + stdout);
            sails.log.info('stderr: ' + stderr);
            return;
          }
        }
      );
      // Perform DB updates
      require('child_process').exec(
        `mysql --default-auth=mysql_native_password --host="${sails.config.connections.localhostMysqlServer.host}" --user="${sails.config.connections.localhostMysqlServer.user}" --password="${sails.config.connections.localhostMysqlServer.password}" --database="${sails.config.connections.localhostMysqlServer.database}" < ${__dirname}/../sql/update.sql`,
        function (err, stdout, stderr) {
          if (err) {
            sails.log.error(
              'Error occurred updating database - but it probably is just adding a field that already exists!'
            );
            sails.log.error('Here is the error anyway: "' + err + '"');
            sails.log.info('stdout: ' + stdout);
            sails.log.info('stderr: ' + stderr);
            return;
          }
        }
      );
    }

    // Update all avatars if required
    if (sails.config.events.updateAvatars) {
      Utility.updateAvatars();
    }

    // Start the late payment daemon
    if (sails.config.events.latePaymentDaemon) {
      // Do this 30 minutes after start just in case we restart lots of times to fix things.
      // We don't want to SPAM organisers...except in development mode of course
      var waitTime = 1000 * 60 * 30;
      if (process.env.NODE_ENV == 'development') {
        waitTime = 10000;
      }

      setTimeout(function () {
        var childProcessDebug = require('child-process-debug'); // Allows the child process to start in debug in the master is in debug
        var latePaymentDaemon = childProcessDebug.fork(__dirname + '/../api/processes/LatePaymentDaemon');

        // Detect any messages
        latePaymentDaemon.on('message', function (data) {
          // Email?
          if (data.email) {
            process.nextTick(function () {
              Email.send(data.email.template, data.email.data, data.email.options, function (err) {
                if (err) sails.log.error(err);
              });
            });
          }
        });

        // Detect it exiting
        latePaymentDaemon.on('exit', function (code, signal) {
          var msg = 'Late payment daemon process exiting with code/signal ' + code + '/' + signal;
          Utility.diagnosticEmail(msg, 'Late payment daemon');
          sails.log.debug(msg);
          latePaymentDaemon = null;
        });
      }, waitTime);
    }
  });

  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  // Make sure we have no locks lingering before doing so
  if (sails.config.mutex.adapter != 'lockfile') {
    Utility.deleteRedisKeys([sails.config.mutex.prefix + '*'], cb);
  } else {
    cb();
  }
};
