/**
 * Orders model.  These are orders (other than craft) to which a user belongs
 *
 */
var Order = {
  
  schema: true,
  
  attributes: {
    
    user:{
        model:'user'
    },
    
    // Order code (from sails.config.events.orders)
    code: {
      type: 'string'
    },

    // Salutation
    salutation: {
      type: 'string'
    },    
    
    // The order entity name
    name: {
      type: 'string'
    },
    
    // The order entity number
    number: {
      type: 'string'
    },
    
    // Centre
    centre: {
      type: 'string'
    },

    // Area
    area: {
      type: 'string'
    },
    
    // Rank
    rank: {
      type: 'string'
    },
   
   

  },
 
};

module.exports = Order;
