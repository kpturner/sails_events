/**
 * BookingController
 *
 * @description :: Server-side logic for managing bookings
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
	/**
	 * Prepare data for booking
	 */	
	prepareBooking:function(req, res) {
		
		var eventId=req.param("eventid");
		 
		Event.findOne(eventId).populate('organiser').exec(function(err,event){
			if (err) {
				return res.negotiate(err);
			}
				
			
			// Now we have to adjust capacity by the number of places booked so far
			var places=0;
			Booking.find({event:eventId}).exec(function(err,bookings){
				if (!err) {
					bookings.forEach(function(booking,index){
						places+=booking.places
					})	
				}
			
				res.locals.event=event;
				res.locals.event.capacity-=places;
					
				// Get the data for the event and the user and then navigate to the booking view
				return res.view("book")		
			})
			
			
			
		})		
		
	},
	
	/**
	 * Make booking
	 */	
	makeBooking:function(req, res) {
		
		var eventId=req.param("eventid");
		 
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
						formattedDate=formattedDate.substr(0,formattedDate.indexOf("00:00:00"))
						
						sails.hooks.email.send(
							"bookingConfirmation",
						    {
						      recipientName: res.locals.user.name,
						      senderName: "Events Management",
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
			)			
			
		})		
		
	},
};

