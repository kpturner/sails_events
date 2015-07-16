/**
 * Passport configuration
 *
 * This is the configuration for your Passport.js setup and where you
 * define the authentication strategies you want your application to employ.
 *
 * I have tested the service with all of the providers listed below - if you
 * come across a provider that for some reason doesn't work, feel free to open
 * an issue on GitHub.
 *
 * Also, authentication scopes can be set through the `scope` property.
 *
 * For more information on the available providers, check out:
 * http://passportjs.org/guide/providers/
 */

module.exports.passport = {
  local: {
    strategy: require('passport-local').Strategy
  },

  //bearer: {
  //  strategy: require('passport-http-bearer').Strategy
  //},

  twitter: {
    name: 'Twitter',
    icon:  'fa-twitter',
    klass:  'omb_btn-twitter',
    protocol: 'oauth',
    strategy: require('passport-twitter').Strategy,
    options: {
      consumerKey: 'fLH76TvwfV68upVcBc2DQs4aK',
      consumerSecret: 'kBacijgm6vWbJPdPvv8lc23GMFPlek4YCBd1kJGIusEELjmAi2'
    }
  },

  //github: {
  //  name: 'GitHub',
  //  protocol: 'oauth2',
  //  strategy: require('passport-github').Strategy,
  //  options: {
  //    clientID: 'your-client-id',
  //    clientSecret: 'your-client-secret'
  //  }
  //},

  facebook: {
    name: 'Facebook',
    icon:  'fa-facebook',
    klass:  'omb_btn-facebook',
    protocol: 'oauth2',
    strategy: require('passport-facebook').Strategy,
    options: {
      clientID: '999387826772688',
      clientSecret: '2ba728651b3b4d40029c54d7019545b6',
      scope: ['email'] /* email is necessary for login behavior */
    }
  },

  google: {
    name: 'Google',
    icon:  'fa-google-plus',
    klass:  'omb_btn-google',
    protocol: 'oauth2',
    strategy: require('passport-google-oauth').OAuth2Strategy,
    options: {
      clientID: '1044760933538-h91m7atpd59n9ieurq49msne5p98sbsb.apps.googleusercontent.com',
      clientSecret: 'PGEGQRLVeEeyP_5Ah3HqDig7',
      max_auth_age: '0',
      scope: ['email'] /* email is necessary for login behavior */
    }
  },

  //cas: {
  //  name: 'CAS',
  //  protocol: 'cas',
  //  strategy: require('passport-cas').Strategy,
  //  options: {
  //    ssoBaseURL: 'http://your-cas-url',
  //    serverBaseURL: 'http://localhost:1337',
  //    serviceURL: 'http://localhost:1337/auth/cas/callback'
  //  }
  //}
};
