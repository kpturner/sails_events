/**
 * Production environment settings
 *
 * This file can include shared settings for a production environment,
 * such as API keys or remote database passwords.  If you're using
 * a version control solution for your Sails app, this file will
 * be committed to your repository unless you add it to your .gitignore
 * file.  If your repository will be publicly viewable, don't add
 * any private information to this file!
 *
 */
var winston = require('winston');

var customLogger = new winston.Logger({
    transports: [
        new(winston.transports.File)({
            level: 'debug',
            filename: './logs/events-service.log'
        }),
    ],
});

module.exports = {

  /***************************************************************************
   * Set the default database connection for models in the production        *
   * environment (see config/connections.js and config/models.js )           *
   ***************************************************************************/

  // models: {
  //   connection: 'someMysqlServer'
  // },

  models: {
      connection: 'localhostMysqlServer',  
      migrate:  'safe'            
  },
  
  log: {
    colors: false,  // To get clean logs without prefixes or color codings
    custom: customLogger,
  },

  // Switch CSRF on for production
  csrf: false,
  
  // Increase hook timeout
  hookTimeout: 90000, // 90 seconds

  /***************************************************************************
   * Set the port in the production environment to 80                        *
   ***************************************************************************/

  //port: 80,

  /***************************************************************************
   * Set the log level in production environment to "silent"                 *
   ***************************************************************************/

  // log: {
  //   level: "silent"
  // }

};
