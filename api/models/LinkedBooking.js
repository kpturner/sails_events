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
     

  },
 
};

module.exports = LinkedBooking;
