/**
 * Development environment settings
 *
 * This file can include shared settings for a development team,
 * such as API keys or remote database passwords.  If you're using
 * a version control solution for your Sails app, this file will
 * be committed to your repository unless you add it to your .gitignore
 * file.  If your repository will be publicly viewable, don't add
 * any private information to this file!
 *
 */

module.exports = {

  /***************************************************************************
   * Set the default database connection for models in the development       *
   * environment (see config/connections.js and config/models.js )           *
   ***************************************************************************/

  // models: {
  //   connection: 'someMongodbServer'
  // }
  
  models: {
      connection: process.env.DB_CONNECTION || 'localhostMysqlServer',  
      migrate:  process.env.DB_MIGRATE || 'alter'            
  },

  session: {
      adapter: 'memory',
  },

   
  // This is needed to ensure that passport authentication works properly on
  // Heroku, otherwise we end up with a redirect_uri of localhost:random port
  proxyHost: process.env.PROXYHOST || null, 

  // Increase hook timeout
  hookTimeout: 60000, // 60 seconds
  
  // Switch CSRF on
  csrf: true,
  
};
