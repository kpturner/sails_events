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
    
        var diagnosticEmail=function(err,subject){
          //console.log("Sending email to "+sails.config.events.developer)
          var errStr;
            if (typeof err=="string")
              errStr=err
            else
              errStr=JSON.stringify(err)
            Email.send(
              "diagnostic",
              {
                err:errStr
              },
              {
                to: sails.config.events.developer,
                subject: subject
              },
              function(){}
            )	
        }
        // Just in case we need it, create a string for any errors
        var subject="Error trying to obtain a unique booking reference for event "+id;       
        // Increment the last booking ref
        Event.query('SELECT GET_LOCK("EVENT",5)',function(err){
          if (err) {
            // Wow!  Disaster - we cannot get a lock so this means something horrible has happened trying to get a 
            // unique booking reference.
            sails.log.error(subject)
            sails.log.error(err);
            diagnosticEmail(err,subject);
            // Pass the error back to the callback if need be
            if (cb) {
              return cb(err,null)
            }
            else {
              return
            }
          }
          else {
            //console.log("Updating "+id)
            Event.query('Update `event` SET `lastBookingRef` = 0 where `lastBookingRef` IS NULL and `id` = ' + id, function(err){
              //console.log(err)
              Event.query('Update `event` SET `lastBookingRef` = `lastBookingRef` + 1 where `id` = ' + id, function(err) {
                if(cb) {
                  if(err) {
                    Event.query('SELECT RELEASE_LOCK("EVENT")');
                    diagnosticEmail(err,subject);
                    return cb(err,null)
                  }
                  else {
                    // Find the event so we can pass the updated version back
                    Event.findOne(id)
                      .then(function(event){
                          Event.query('SELECT RELEASE_LOCK("EVENT")');
                          return cb(err,event);  
                      })
                      .catch(function (err) {
                          Event.query('SELECT RELEASE_LOCK("EVENT")'); 
                          diagnosticEmail(err,subject);                    
                          return cb(err,null);  
                      });             
                  }                  
                } 
                else {
                  Event.query('SELECT RELEASE_LOCK("EVENT")');
                  diagnosticEmail(err,subject);
                  return;
                } 
              })     
            })        
          }
        })
        
  },
  
};

