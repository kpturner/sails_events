/**
 * EventController
 *
 * @description :: Server-side logic for managing events
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
	/**
	 * Events
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	events: function(req, res) {
		res.view('events',{
		  filter: req.session.eventFilter,
		  errors: req.flash('error')
		});  
	}, 
	 
	/**
	 * Get open events
     * Find all events for the current user that are open and not passed closing date
	 * 
	 * @param {Object} req
	 * @param {Object} res
	 */
	openEvents: function (req, res) {
		
		var today=new Date();
		today=new Date(today.setHours(0));
		today=new Date(today.setMinutes(0));
		today=new Date(today.setSeconds(0));
		var selectedUserId=req.param("selecteduserid");  // If this exists, omit events for which this user is already booked in
		
		// An example using promises (bluebird)
		/*				
		Event.find({
					where:	{
								open:true,
								closingDate: { '>=': today } 
							}, 
					sort: 	{
								date:'desc',
								time:'desc'
							}
					})
					.populate('organiser')
					.then(function(events){
						console.log(events.length)
						 return events;
					}).spread(function(event1,event2){
						// Promises are awesome!
						console.log(event1)
						console.log(event2)
					}).catch(function(err){
						// An error occurred
					})
		*/
		
		Event.find({
					where:	{
								open:true,
								closingDate: { '>=': today } 
							}, 
					sort: 	{
								date:'desc',
								time:'desc'
							}
					})
					.populate('organiser')
			.exec(
				function(err, events){
					if (err) {
						sails.log.verbose('Error occurred trying to retrieve events.');
						return res.negotiate(err);
				  	}	
				
				  	// If session refers to a user who no longer exists, still allow logout.
				  	if (!events) {
				    	return res.json({});
				  	}
					  
					// If we have a selectedUserId then only include events that the user is NOT booked into already
					if (selectedUserId && !sails.config.events.multipleBookings) {
						var particularEvents=[];
						events.forEach(function(event,index){
							Booking.find(
								{
									where: {
										event: event.id,
										user: selectedUserId
									},
									limit: 1
								}
							).exec(function(err,bookings){
								if (bookings.length<=0) {
									particularEvents.push(event)
								}
								if (index==events.length-1) {
									// End of the list of events
									return res.json(particularEvents);  	
								}
							})
						})						
					}					
					else {
						return res.json(events);  	
					}  					
				}
			)
			
	},
	
	/**
	 * Get all events for editing
     * 
	 * @param {Object} req
	 * @param {Object} res
	 */
	allEvents: function (req, res) {
		
		var filter=req.param('filter');
		req.session.eventFilter=filter;
						
		var where = {};
		
		if (filter && filter.length>0) {
			where = {
				or: [
					{name: {contains: filter}},
					{venue: {contains: filter}},	
					{blurb: {contains: filter}},
				 
				]
			}
		}
										
		Event.find({
						where: where,
						sort: {
								date:'desc',
								time:'desc'
						}
					}
			).populate('organiser').exec(
			function(err, events){
				if (err) {
					sails.log.verbose('Error occurred trying to retrieve events.');
					return res.negotiate(err);
			  	}	
			
			  	// If session refers to a user who no longer exists, still allow logout.
			  	if (!events) {
			    	return res.json({});
			  	}
				  
				return res.json(events);  
			}
		)
			
	},
		
	/**
	 * Prepare event for copy/edit/delete
	 */	
	prepareEvent: function(req, res) {
		
		var action=req.param("action");
		var eventId=req.param("eventid");
		var mode=action.substr(0,1).toUpperCase()+action.substr(1);		
		
		// If we have an event id, retrieve it
		if (eventId) {
			Event.findOne(eventId).exec(function(err, event){
				if (err) {
					return res.negotiate(err);	
				}
				// Send the details
				return res.view("eventdetails",{
					mode:mode,
					event:event
				})	
			})	
		} 
		else {
			return res.view("eventdetails",{
				mode:mode,
				event:{}
			})	
		}	
	},
	
	/**
	 * Update event (copy/edit/delete)
	 */	
	updateEvent: function(req, res) {
		
		var action=req.param("action");
		var event=req.param("data");
		var eventId=event.id;
		
		// Sort out the event time
		if (event.time.length>8) {
			try {
				event.time=(new Date(event.time).toTimeString()).split(" ")[0];		
			}
			catch (e) {
				// Mmmm, whats going on?   Let the database throw the error
			}		
		}
		
		// Decide what to do based on the action
		if (action=="edit") {
			Event.update(eventId,event).exec(function(err,event){
				if (err) {
					// If this is a uniqueness error about the code attribute,
				    // send back an easily parseable status code.
				    if (err.invalidAttributes && err.invalidAttributes.code && err.invalidAttributes.code[0]
				      && err.invalidAttributes.code[0].rule === 'unique') {
				       return res.genericErrorResponse(411,"Event code (for payment) is already in use");
				    }
					// Else unknown error
					return res.negotiate(err)
				}
				return res.ok();	
			})
		}
		else if (action=="delete") {
			// Make sure there are no bookings!
			Booking.find({event:eventId}).exec(function(err,bookings){
				if (bookings && bookings.length>0) {
					return res.genericErrorResponse(460,"You cannot delete an event with bookings against it!")
				}
				// Carry on and delete it
				Event.destroy(eventId).exec(function(err){
					if (err) {
						return res.negotiate(err)
					}
					return res.ok();
				})
				
			})
		}
		else if (action=="copy" || action=="create") {
			delete event.id;
			Event.create(event).exec(function(err,event){
				if (err) {
					// If this is a uniqueness error about the code attribute,
				    // send back an easily parseable status code.
				    if (err.invalidAttributes && err.invalidAttributes.code && err.invalidAttributes.code[0]
				      && err.invalidAttributes.code[0].rule === 'unique') {
				       return res.genericErrorResponse(411,"Event code (for payment) is already in use");
				    }
					// Else unknown error
					return res.negotiate(err)
				}
				return res.ok();	
			})
		}
		
		
	}
	
};

