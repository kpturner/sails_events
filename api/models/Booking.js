/**
* Booking.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {

    // Who made the booking
    user: { 
      model: 'User', 
      required: true 
    },
       
    // Which event?
    event: {
      model: 'Event',
      required: true
    },    
      
    // Booking reference
    ref:{
      type: 'string' 
    }, 
      
    // The user's dietary requirements
    dietary: {
      type: 'string'
    },  
      
    // Places booked
    places: {
      type: 'integer'
    },  
          
    // Total cost
    cost: {
      type: 'float',
      size: 15.2 // Decimal
    },
    
    amountPaid: {
      type: 'float',      
      size: 15.2 // Decimal
    },
    
    paid: {
      type: 'boolean'
    },
    
    // Additional info
    info: {
      type: 'text'
    },
    
    // Additional linked bookings
    additions : { 
      collection: 'LinkedBooking', via: 'booking' 
    },

  }
};

