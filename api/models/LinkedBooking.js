/**
 * Linked booking model.  These are details of additional people added to a
 * single booking
 *
 */
var LinkedBooking = {

  schema: true,

  attributes: {

    booking:{
        model:'booking'
    },

    seq:{
      type: 'integer'
    },

    // Salutation
    salutation: {
      type: 'string'
    },

    // Preferred name
    surname: {
      type: 'string'
    },

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

    // The user's lodge year
    lodgeYear: {
      type: 'string'
    },

    // The user's centre
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

    // The user's dietary requirements
    dietary: {
      type: 'string'
    },

    // Car Reg
    carReg: {
      type: 'string'
    },

    // Menu choice
    menuChoice: {
      type: 'integer'
    }

  },

};

module.exports = LinkedBooking;
