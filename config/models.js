/**
 * Default model configuration
 * (sails.config.models)
 *
 * Unless you override them, the following properties will be included
 * in each of your models.
 *
 * For more info on Sails models, see:
 * http://sailsjs.org/#!/documentation/concepts/ORM
 */

module.exports.models = {

  /***************************************************************************
  *                                                                          *
  * Your app's default connection. i.e. the name of one of your app's        *
  * connections (see `config/connections.js`)                                *
  *                                                                          *
  ***************************************************************************/
  // connection: 'localDiskDb',

  /***************************************************************************
  *                                                                          *
  * How and whether Sails will attempt to automatically rebuild the          *
  * tables/collections/etc. in your schema.                                  *
  *                                                                          *
  * See http://sailsjs.org/#!/documentation/concepts/ORM/model-settings.html  *
  *                                                                          *
  ***************************************************************************/
  // migrate: 'alter'
  
  // Define indexes that need to exist. These are composite keys that Waterline
    // doesn't support
    indexes: {
        lodgeroom_key:    { 
            table:      "lodgeroom",
            columns:    ["event","booking"]
        },
        
        lodgeroom_booking:    { 
            table:      "lodgeroom",
            columns:    ["booking"]
        }, 

        booking_payment_session:    { 
            table:      "booking",
            columns:    ["paymentSessionId"]
        },  
         
        booking_user:    { 
            table:      "booking",
            columns:    ["user"]
        },  
        
        booking_event:    { 
            table:      "booking",
            columns:    ["event"]
        },  
        
        linkedbooking_booking:    { 
            table:      "linkedbooking",
            columns:    ["booking","seq"]
        },  

        order_user:    { 
            table:      "order",
            columns:    ["user","code"]
        },  
         
    },


};
