/**
 * BookingController
 *
 * @description :: Server-side logic for managing bookings
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
		  
	/**
	 * My bookings
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	myBookings: function(req, res) {
		req.session.myBookings=true;
		res.view('bookings',{			
		  filter: req.session.bookingFilter,
		  myBookings: true,
		  errors: req.flash('error')
		});  
	}, 
	
	
	/**
	 * Prepare data for booking
	 */	
	prepareBooking:function(req, res) {
		
		var eventId=req.param("eventid");
		var myBookings=(req.param("mybookings"))?true:false;
				 
		Event.findOne(eventId).populate('organiser').exec(function(err,event){
			if (err) {
				return res.negotiate(err);
			}
			
			// Private function to process the initiation
			var initialiseBooking=function(existingBooking){
				// Now we have to adjust capacity by the number of places booked so far
				var places=0;
				var criteria={};
				criteria.event=eventId;
				if (existingBooking) {
					criteria.id={"!":existingBooking.id} // Exclude the existing booking details from the calcs
				}
				Booking.find(criteria).exec(function(err,bookings){
					if (!err) {
						bookings.forEach(function(booking,index){
							places+=booking.places
						})	
					}
				
					res.locals.event=event;
					res.locals.event.capacity-=places;
					res.locals.booking=existingBooking;
					res.locals.myBookings=myBookings;
						
					// Get the data for the event and the user and then navigate to the booking view
					if (req.wantsJSON)
						return res.json({
								model:'booking'
							});
					else
						return res.view("book",{
								model:'booking'
							});		
				})	
			}
				
			// Has the user already made this booking?  If multiple bookings are allowed, we don't care (treat it as a new booking)
			if (!sails.config.events.multipleBookings) {
				Booking.findOne({
									event: eventId,
									user:req.user.id
								}).exec(function(err, existingBooking) {
					// if there is already a booking for this user the called function will get it, otherwise it will get nada
					initialiseBooking(existingBooking);	
				})
			}
			else {
				initialiseBooking();
			}
			
				
			
		})		
		
	},
	
	/**
	 * Make booking
	 */	
	makeBooking:function(req, res) {
		
		var eventId=req.param("eventid");
		var bookingId=req.param("bookingId");		
				 
		Event.findOne(eventId).populate("organiser").exec(function(err,event){
			if (err) {
				return res.negotiate(err);
			}
			
			// Update the user profile
			var user={};
			user.name=req.param("name");
			user.lodge=req.param("lodge");
			user.lodgeNo=req.param("lodgeNo");
			user.rank=req.param("rank");
			user.dietary=req.param("dietary");
			user.email=req.param("email");
			var linkedBookings=req.param("linkedBookings");
			
			User.update(res.locals.user.id,user).exec(
				function(err,users) {
					if (err) {
						return res.negotiate(err);
					}
					
					// User updated
					req.user=users[0];
					res.locals.user=req.user;
					
					// Before making the booking, make doubly sure we have capacity
					var places=0;
					var criteria={};
					criteria.event=eventId;
					if (bookingId) {
						criteria.id={"!":bookingId} // Exclude the existing booking details from the calcs
					}
					Booking.find(criteria).exec(function(err,bookings){
						if (!err) {
							bookings.forEach(function(booking,index){
								places+=booking.places
							})	
						}
						event.capacity-=places;
						 
						// Capacity must exceed (at least) places requested 
						if (event.capacity>=req.param("places")) {
						
							// Private function to process booking
							var processBooking=function(){
								var booking={};
								booking.user=res.locals.user.id;
								booking.event=eventId;
								booking.info=req.param("info");
								if (req.param("places")) {
									booking.places=req.param("places")
								}
								else {
									booking.places=1
								}
			      				booking.cost=booking.places*event.price;
								booking.amountPaid=0;
								
								Booking.create(booking,function(err, booking){
									if (err) {
										return res.negotiate(err);
									}
															
									// Create linked bookings
									if (linkedBookings) {
										linkedBookings.forEach(function(linkedBooking,index){
											linkedBooking.booking=booking.id;
											if (!linkedBooking.rank)
												linkedBooking.rank=""
											if (!linkedBooking.dietary)
												linkedBooking.dietary=""
											if (!linkedBooking.lodge)
												linkedBooking.lodge=""
											if (!linkedBooking.lodgeNo)
												linkedBooking.lodgeNo=""
											LinkedBooking.create(linkedBooking).exec(function(err,lb){
												if (err)
													console.log(err)	
											})
										})
									}
			 						
									// Send confirmation email
									if (res.locals.user.dietary==null)
					                	res.locals.user.dietary=""
					                if (res.locals.user.rank==null)
					                	res.locals.user.rank=""
									 
									
									var formattedDate=event.date.toString();
									formattedDate=formattedDate.substr(0,formattedDate.indexOf("00:00:00"));
									var updated="";
									if (bookingId)
										updated=' has been updated'
									
									sails.hooks.email.send(
										"bookingConfirmation",
									    {
									      recipientName: res.locals.user.name,
									      senderName: "Events Management",
										  		updated: updated,
												eventName: event.name,
												eventDate: formattedDate,
												eventTime: event.time,
												eventVenue: event.venue,
												eventBlurb: event.blurb,
												eventMenu: event.menu,
												eventDressCode: event.dressCode,
											  	email: res.locals.user.email,
											  	lodge: res.locals.user.lodge,
											  	lodgeNo: res.locals.user.lodgeNo,
											  	rank: res.locals.user.rank,
											  	dietary: res.locals.user.dietary,
											  	bookingRef: event.code+"/"+booking.id.toString(),
												info: booking.info,  
												places: booking.places,
												linkedBookings: linkedBookings,
												paymentDetails: event.paymentDetails
									    },
									    {
									      to: res.locals.user.email,
										  cc: event.organiser.email,
									      subject: "Event booking confirmation"
									    },
									    function(err) {if (err) console.log(err);}
									   )    		
									
									// Get the data for the event and the user and then navigate to the booking view
									return res.ok();
								})
							}
						
							// If we have an existing booking, zap it before making the new booking
							if (bookingId) {
								Booking.destroy(bookingId,function(err){
									LinkedBooking.destroy({booking:bookingId},function(err){
										processBooking();
									})
								})
							}
							else {
								processBooking();
							}
							
							
						}
						else {
							//No capacity!
							return res.genericErrorResponse("455","Booking failed. The event does not have capacity for the places requested")
						}						
	
					})	
				}
			)			
			
		})		
		
	},
	
	
	/**
	 * Validate additional bookings in case they are duplicates
	 * 
	 */
	validateAdditions: function(req, res) {
		
		var bookingId=req.param("bookingId")
		var linkedBookings=req.param("linkedBookings");
		var eventId=req.param("eventId")
		 
		// Now we want a list of additional bookings that are recorded against this
		// event, excluding those from this particular booking
		var duplicates=[];
		Booking.find({
				event: eventId,
				id: {"!":bookingId}
			}).populate("additions")
			.exec(function(err,bookings){
				if (err) {
					console.log(err)
				}
				// Traverse the bookings and analyse each additional booking
				if (bookings) {
					bookings.forEach(function(booking,b){
						booking.additions.forEach(function(lb,l){
							// Possible duplicate?
							linkedBookings.forEach(function(ob,m){
								if (
										lb.surname.toLowerCase()==ob.surname.toLowerCase()
									&&	lb.firstName.toLowerCase()==ob.firstName.toLowerCase()	
								) {
										duplicates.push(ob)
								}	
							})						
						})
					})	
				}				
				return res.json(duplicates)
			}) 
		
	},
	
	/**
	 * Get all bookings  
     * 
	 * @param {Object} req
	 * @param {Object} res
	 */
	allBookings: function (req, res) {
		
		var filter=req.param('filter');
		req.session.bookingFilter=filter;
		var myBookings=(req.param('mybookings')=='1');
						
		var where = {};
		
		if (myBookings) {
			where.user=req.user.id;
		}
		
		if (filter && filter.length>0) {
			where.or= 	[
							{event:{name: {contains: filter}}},
					
						]
			
		}
										
		Booking.find({
						where: where,
						sort: {
								event: {
									date:2,
									time:2
								}		
						}
					}
			).populate('event').exec(
			function(err, bookings){
				if (err) {
					sails.log.verbose('Error occurred trying to retrieve bookings.');
					return res.negotiate(err);
			  	}	
			
			  	// If session refers to a user who no longer exists, still allow logout.
			  	if (!bookings) {
			    	return res.json({});
			  	}
				  
				return res.json(bookings);  
			}
		)
			
	},
	
};

