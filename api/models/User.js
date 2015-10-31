var User = {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    // Username
    username  : { 
      type: 'string', 
      unique: true 
    },
    
    passports : { 
      collection: 'Passport', via: 'user' 
    },
    
    // Preferred name
    name: {
      type: 'string'
    },
    
    // Salutation
    salutation: {
      type: 'string'
    },
    
    // Surname
    surname: {
      type: 'string'
    },
    
    // First name
    firstName: {
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
        
    // The user's area
    area: {
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
    
    // Contact number
    phone: {
      type: 'string'
    },

    // Administrator?
    isAdmin: {
      type: 'boolean' 
    },
    
    // Organiser?
    isOrganiser: {
      type: 'boolean' 
    },
    
    // Visiting Officer?
    //isVO: {
    //  type: 'boolean'
    //},
    
    // VO Lodge
    //voLodge: {
    //  type: 'string'
    //},
    
    // VO lodge number
    //voLodgeNo: {
    //  type: 'string'
    //},
    
    // Authentication provider (some redundancy here as we can get this from the passport, but takes
    // the additional I/O out of each request)
    authProvider: {
      type: 'string'  
    },
        
    // The timestamp when the the user last logged in
    // (i.e. sent a username and password to the server)
    lastLoggedIn: {
      type: 'datetime',
      defaultsTo: new Date(0)
    },

    // url for gravatar
    gravatarUrl: {
      type: 'string'
    }
  }
};

module.exports = User;
