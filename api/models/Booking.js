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
      
    // Places booked
    places: {
      type: 'integer'
    },  
          
    // Total cost
    cost: {
      type: 'float'
    },
    
    amountPaid: {
      type: 'float'
    },
    
    paid: {
      type: 'boolean'
    },
    
    // Additional info
    info: {
      type: 'text'
    },
    
    // linked bookings
    linkBookings : { 
      collection: 'LinkedBooking', via: 'booking' 
    },

  }
};

