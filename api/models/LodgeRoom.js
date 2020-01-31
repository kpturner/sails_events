/**
 * Lodge Room model.  Simple list of bookees for lodge room planning
 *
 */
var LodgeRoom = {
  
  schema: true,
  
  attributes: {
         
    event:{
        model:'event'
    },
    
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
   
    // The user's rank
    rank: {
      type: 'string'
    },
    
    cancelled: {
        type: 'boolean',
    }

  },
 
};

module.exports = LodgeRoom;
