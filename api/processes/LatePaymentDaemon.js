/**
 * LatePaymentDaemon
 *
 * @description :: Server-side logic for managing late payment reminders
 */
 
process.on('disconnect', function() {
	// Parent is exiting
	process.exit(0);
});

// When we get some data, start listening to the queue
process.on('message', function(parms) {
			 
	switch (parms.action) {
		case "*START":
			process.send({action:"*LOG",message:"Late payment daemon started" + ((parms.reminderTestMode)?" in test mode":"")});
		
			// Every 24 hours, email late payers
			setInterval(function(){
				process.send({action:"*LATEPAYERS"});
			},parms.latePaymentInterval)
			 
			break;
			
		case "*STOP":
			process.send({action:"*LOG",message:"Late payment daemon stopping"});
			process.exit(0);
	}
	 
	
});