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
      unique: true,
      required: true 
    },
    
    organiser: { model: 'User', required: true },
    
    // Where it is
    venue : {
      type: 'string',
      required: true
    },
    
    // Description
    blurb: {
      type: 'string',      
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
    
    // Time of arrival
    time: {
      type: 'time'
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
    
    price: {
      type: 'float',
      required: true
    },
    
    instantPayment: {
      type: 'boolean'
    }
    
  }
};

