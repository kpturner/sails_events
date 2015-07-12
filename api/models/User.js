/**
* User.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
   
  attributes: {
    // The user's full name
    // e.g. Nikola Tesla
    name: {
      type: 'string',
      required: true
    },
    
    // user name (can be used instead of email address)
    userName: {
      type: 'string',
      required: true,
      unique: true  
    },
    
    // The user's lodge
    // e.g. Hamtun
    lodge: {
      type: 'string',
      required: true
    },
    
    // The user's lodge no
    // e.g. 7083
    lodgeNo: {
      type: 'string',
      required: true
    },
    
    // The user's rank
    // e.g. PPDGDC
    rank: {
      type: 'string'
    },
    
    // The user's dietary requirements
    // e.g. Vegetarian
    dietary: {
      type: 'string'
    },

    // The user's email address
    // e.g. nikola@tesla.com
    email: {
      type: 'email',     
      required: true,
      unique: true
    },

    // Administrator?
    isAdmin: {
      type: 'boolean' 
    },
    
    // The encrypted password for the user
    // e.g. asdgh8a249321e9dhgaslcbqn2913051#T(@GHASDGA
    encryptedPassword: {
      type: 'string',
      required: true
    },

    // The timestamp when the the user last logged in
    // (i.e. sent a username and password to the server)
    lastLoggedIn: {
      type: 'date',
      required: true,
      defaultsTo: new Date(0)
    },

    // url for gravatar
    gravatarUrl: {
      type: 'string'
    }
  }
};

