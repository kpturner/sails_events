/**
 * LatePaymentDaemon
 *
 * @description :: Server-side logic for managing late payment reminders
 */
 
var sails;
// Override the grunt hook to do nothing
var cfg={
        hooks: {
            //grunt: function(sails){return {}}
            grunt: false
        },
        models: {
            migrate: 'safe'
        }
    };
 
//cfg.hooks={grunt:null};
require('sails').load(cfg,function(err, sailsInstance) {
    // At this point you have access to all your models, services, etc.
    // Initialise the "sails" global
    sails=sailsInstance;
     
    // Get some config
    var latePaymentInterval = sails.config.events.latePaymentInterval;
    var reminderTestMode = sails.config.events.reminderTestMode;
 
    sails.log.debug("Late payment daemon started" + ((reminderTestMode)?" in test mode":"")); 
        
    // On start up, and then every preconfigured interval, email late payers			
    sails.controllers.booking.processLatePayers();
    setInterval(function(){          
        sails.controllers.booking.processLatePayers();
    },latePaymentInterval)
    
}); 
 
// process.stdout.write(new Date()+" Late daemon child process\n"); 
 
process.on('disconnect', function() {
	// Parent is exiting
	process.exit(0);
});

// When we get some data, start listening to the queue
process.on('message', function(parms) {
			 
	switch (parms.action) {		
		case "*STOP":
			sails.debug.log("Late payment daemon stopping");
			process.exit(0);	
    }
	 
	
});