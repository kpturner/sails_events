var User = {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    username  : { type: 'string', unique: true },
    //email     : { type: 'email',  unique: true },
    passports : { collection: 'Passport', via: 'user' },
    
    // Preferred name
    name: {
      type: 'string'
    },
    
    // The user's lodge
    lodge: {
      type: 'string'
    },
    
    // The user's lodge no
    lodgeNo: {
      type: 'string'
    },
    
    // The user's rank
    rank: {
      type: 'string'
    },
    
    // The user's dietary requirements
    dietary: {
      type: 'string'
    },

    // The user's email address
    email: {
      type: 'email', 
      unique: true
    },

    // Administrator?
    isAdmin: {
      type: 'boolean' 
    },
    
    // Authentication provider (some redundancy here as we can get this from the passport, but takes
    // the additional I/O out of each request)
    authProvider: {
      type: 'string'  
    },
        
    // The timestamp when the the user last logged in
    // (i.e. sent a username and password to the server)
    lastLoggedIn: {
      type: 'date',
      defaultsTo: new Date(0)
    },

    // url for gravatar
    gravatarUrl: {
      type: 'string'
    }
  }
};

module.exports = User;
