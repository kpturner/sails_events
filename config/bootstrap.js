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
      
    Utility.diagnosticEmail("Provincial events app started OK","Developers Paranoia!");	  
      
    // Start the late payment daemon
    if (sails.config.events.latePaymentDaemon) {
        var childProcessDebug = require('child-process-debug'); // Allows the child process to start in debug in the master is in debug
        var latePaymentDaemon = childProcessDebug.fork(__dirname+"/../api/processes/LatePaymentDaemon");
        
        // Detect it exiting
        latePaymentDaemon.on("exit", function(code, signal){
            var msg="Late payment daemon process exiting with code/signal "+code+"/"+signal ;  
            Utility.diagnosticEmail(msg,"Late payment daemon");	
            sails.log.debug(msg);
            latePaymentDaemon=null;     
        });    
    }    
      
    process.on('uncaughtException', function (err) {
        try {
            var msg=(new Date).toUTCString() + ' uncaughtException: '+err.message;
            msg+="</br>"+err.stack;
            Utility.diagnosticEmail(msg,"Application crash");     
            sails.log.error((new Date).toUTCString() + ' uncaughtException:', err.message);
            sails.log.error(err.stack);
        }
        catch(e) {
            sails.log.error("Error handling uncaught exception");
            sails.log.error(e);   
        }
        process.exit(1);   //Forever should restart us;
    })  
        
  }); 

  
  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  cb();
};
