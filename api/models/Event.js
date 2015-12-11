/**
* Event.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    
    // Name 
    name  : { 
      type: 'string', 
      required: true 
    },
    
    // Organiser
    organiser: { model: 'User', required: true },
    
    // Code (for booking references)
    code : {
      type: 'string',
      unique: true,
      required: true
    },
    
    // Where it is
    venue : {
      type: 'string',
      required: true
    },
    
    // Description
    blurb: {
      type: 'text',      
    },
    
    // Menu
    menu: {
      type: 'string'
    },
    
    // Dress code
    dressCode: {
      type: 'string'
    },
            
    // Number of people 
    capacity: {
      type: 'integer',
      required: true 
    },
    
    // Date of event
    date: {
      type: 'date',
      required: true
    },
    
    // Time of arrival (seems to be a bug in sails-mysql with regard to using a type of "time" so switched to "string")
    //  https://github.com/balderdashy/sails-mysql/issues/241
    time: {
      type: 'string'
    },
    
    // When do booking close
    closingDate: {
      type: 'date',
      required: true
    },
    
    // Event is open or closed 
    open: {
      type: 'boolean',
    },
    
        
    // Visiting Officers only 
    //voOnly: {
    //  type: 'boolean',
    //},
    
    price: {
      type: 'float',
      size: 15.2, // Decimal
      required: true
    }, 
         
    minBookingPlaces: {
      type: 'integer',
      defaultsTo: 1
    },    
     
    maxBookingPlaces: {
      type: 'integer',
      defaultsTo: 10
    }, 
        
    instantPayment: {
      type: 'boolean'
    },
    
    paymentDetails: {
      type: 'text'
    },
    
    // Number of days grace the bookee has to make payment
    grace: {
      type: 'integer'
    },
    
    lastBookingRef: {
      type: 'integer',
      defaultsTo: 0
    },  
    
  },
  
  // Function to increment booking ref
  incrementLastBookingRef : function(id, cb) {
     
        // TODO We need this more atomic so use 
        // SET WAIT_TIMEOUT
        // LOCK TABLES event WRITE
        // ....do the stuff
        // UNLOCK TABLES
     
        // Increment the last booking ref
        Event.query('Update `event` SET `lastBookingRef` = 0 where `lastBookingRef` IS NULL and `id` = ' + id, function(err){
          Event.query('Update `event` SET `lastBookingRef` = `lastBookingRef` + 1 where `id` = ' + id, function(err) {
            if(cb) {
              if(err) return cb(err,null);
              // Find the event so we can pass the updated version back
              Event.findOne(id)
                .then(function(event){
                    return cb(err,event);  
                })
                .catch(function (err) {
                    return cb(err,null);  
                });           
            } 
            else {
              return;
            } 
          })     
        })        
  },
  
};

