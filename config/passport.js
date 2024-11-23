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

  rememberme: {
    strategy: require('passport-remember-me').Strategy,
    maxAge: 7 * 24 * 60 * 60 * 1000 // Time to live for remember me cookie
  },

  //bearer: {
  //  strategy: require('passport-http-bearer').Strategy
  //},

  twitter: {
    name: 'Twitter',
    icon: 'fa-twitter',
    klass: 'omb_btn-twitter',
    protocol: 'oauth',
    strategy: require('passport-twitter').Strategy
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
    icon: 'fa-facebook',
    klass: 'omb_btn-facebook',
    protocol: 'oauth2',
    strategy: require('passport-facebook').Strategy,
    options: {
      scope: ['email'] /* email is necessary for login behavior */,
      profileFields: ['emails', 'displayName']
    }
  },

  google: {
    name: 'Google',
    icon: 'fa-google-plus',
    klass: 'omb_btn-google',
    protocol: 'oauth2',
    strategy: require('passport-google-oauth').OAuth2Strategy,
    options: {
      max_auth_age: '0',
      scope: ['email'] /* email is necessary for login behavior */,
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
    }
  }

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
