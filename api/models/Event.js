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
    
    // Organiser(s)
    organiser: { model: 'User', required: true },
    organiser2: { model: 'User' },

    // Director of Ceremonies
    dc: { model: 'User' },
    
    order: {
      type:'string'
    },

    // Code (for booking references)
    code : {
      type: 'string',
      unique: true,
      required: true
    },
    
    logo: {
      type: 'string'
    },
    
    
    logoRight: {
      type: 'string'
    },
    
    additionalInfo: {
        type: 'string'
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
      type: 'text'
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
    
    // If entered, bookings may only be entered on or after this date
    openingDate: {
      type: 'date',
      required: false
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

    // Hide event (even if open) until opening date 
    hide: {
      type: 'boolean',
    },  

    // Address details are required 
    addressReqd: {
      type: 'boolean',
    },

    // Area details are required 
    areaReqd: {
      type: 'boolean',
    },

    // Free event? 
    free: {
      type: 'boolean',
    },   

    // Registering interest only event? 
    regInterest: {
      type: 'boolean',
    },   

    // Visiting Officers details required? 
    voReqd: {
      type: 'boolean',
    },
    
    price: {
      type: 'float',
      size: 15.2, // Decimal 
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
    
    showApologyButton: {
      type: 'boolean'
    },
    
    bypassCode: {
      type: 'string'
    },
    
    latePaymentChecking: {
      type: 'boolean'
    },        
    
    lastBookingRef: {
      type: 'integer',
      defaultsTo: 0
    },  
    
  },
  
  // Function to increment booking ref
  incrementLastBookingRef : function(id, cb) {

        // We will use a mutex to make sure no two booking attempts
        // can do this simultaneously 
        Mutex.initialise();  // Does nothing after first call   
        
        // Lock the mutex if we can. Wait for a maximum of 10 seconds.  let the 
        // lock die naturally after 30 seconds if the server dies or something.
        var opts={
          duration:   30000,
          maxWait:    10000,
        }
          
        // Just in case we need it, create an email subject string for any errors
        var subject="Error trying to obtain a unique booking reference for event "+id;       
        // Increment the last booking ref - get lock (waiting 10 seconds at most)
        var ss=new Date().getTime();
        var lockHandle="EVENT_"+sails.config.port;

        var ss=new Date().getTime();
        Mutex.lock(lockHandle,opts,function(err,lock){
          if (err) {
            // Wow!  Disaster - we cannot get a lock so this means something horrible has happened trying to get a 
            // unique booking reference.
            sails.log.error(subject)
            sails.log.error(err);
            Utility.diagnosticEmail(err,subject);            
          }  

          // Whether we have the lock or not, update the event
          Event.query('Update `event` SET `lastBookingRef` = `lastBookingRef` + 1 where `id` = ' + id, function(err) {                
              // Callback or not?
              if(cb) {
                if(err) {  
                  // Release the lock  
                  if (lock) {
                      Mutex.unlock(lock,function(err){
                        if (err) {
                          sails.log.error(err)
                        }                      
                      });     
                  }          
                  Utility.diagnosticEmail(err,subject);
                  return cb(err,null)
                }
                else {
                  // Find the event so we can pass the updated version back
                  Event.findOne(id)
                    .then(function(event){                                    
                        return cb(err,event);  
                    })
                    .catch(function (err) {                                       
                        Utility.diagnosticEmail(err,subject);                    
                        return cb(err,null);  
                    })
                    .finally(function(){
                        // Release the lock                 
                        if (lock) {
                            Mutex.unlock(lock,function(err){
                              if (err) {
                                sails.log.error(err)
                              }                      
                            });     
                        }                
                    });             
                }                  
              } 
              else {  
                // No callback
                // Release the lock                 
                if (lock) {
                    Mutex.unlock(lock,function(err){
                      if (err) {
                        sails.log.error(err)
                      }                      
                    });     
                }                  
                if(err) {
                  Utility.diagnosticEmail(err,subject);
                }
                return;
              } 
            })     
                
        });            

        
  },
  
};

