var User = {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    // Username
    username: {
      type: 'string',
      unique: true
    },

    passports: {
      collection: 'Passport',
      via: 'user'
    },

    orders: {
      collection: 'Order',
      via: 'user'
    },

    // Preferred name
    name: {
      type: 'string'
    },

    category: {
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

    lodgeYear: {
      type: 'string'
    },

    // The user's masonic centre
    centre: {
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

    // Address
    address1: {
      type: 'string'
    },

    address2: {
      type: 'string'
    },

    address3: {
      type: 'string'
    },

    address4: {
      type: 'string'
    },

    postcode: {
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

    // DC?
    isDC: {
      type: 'boolean'
    },

    // Permanent diner?
    isPD: {
      type: 'boolean'
    },

    // VO?
    isVO: {
      type: 'boolean'
    },

    // VO Lodge
    voLodge: {
      type: 'string'
    },

    // VO lodge number
    voLodgeNo: {
      type: 'string'
    },

    // The VO masonic centre
    voCentre: {
      type: 'string'
    },

    // The VO area
    voArea: {
      type: 'string'
    },

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

    useGravatar: {
      type: 'boolean'
    },

    // url for gravatar (unless the user is using Social Media, in which case we will get it from there)
    gravatarUrl: {
      type: 'string'
    },

    // SPAM warning acknowledged
    spamAck: {
      type: 'boolean'
    }
  }
};

module.exports = User;
