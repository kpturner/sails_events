/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.bootstrap.html
 */

module.exports.bootstrap = function(cb) {

  // Load the passport strategies
  sails.services.passport.loadStrategies();
  
  sails.on('lifted', function() {
    // Start the late payment daemon
    latePaymentDaemon = require("child_process").fork(__dirname+"/../api/processes/LatePaymentDaemon");
    // Detect it exiting
    latePaymentDaemon.on("exit", function(code, signal){
      sails.log.debug("Late payment daemon process exiting with code/signal "+code+"/"+signal );
      latePaymentDaemon=null;
    });
    // Detect messages
    latePaymentDaemon.on("message", function(data){
      switch (data.action) {
        case "*LOG":
          sails.log.debug(data.message); 
          break;
        case "*LATEPAYERS":         
          sails.controllers.booking.processLatePayers();
          break;
      }
       
    });
    // Send the Sails object
    latePaymentDaemon.send({
      action              :   "*START",
      latePaymentInterval :   sails.config.events.latePaymentInterval,
    });	    
    // Send the Sails object
    //setTimeout(function(){
    //  latePaymentDaemon.send({
    //    action:   "*STOP"
    //  });	    
    //},30000)
        
  }); 

  
  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  cb();
};
