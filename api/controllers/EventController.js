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
		var today=new Date().getDate();
		
		Event.find({
					where:	{
								open:true,
								closingDate: { '>': today } 
							}, 
					sort: 	{
								date:1,
								time:1
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
					  
					return res.json(events);  
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
								date:2,
								time:2
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
					return res.negotiate(err)
				}
				return res.ok();	
			})
		}
		
		
	}
	
};
