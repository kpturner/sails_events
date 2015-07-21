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
			
			res.locals.event=event;
			
			// Get the data for the event and the user and then navigate to the booking view
			return res.view("book")	
			
		})		
		
	},
	
	/**
	 * Make booking
	 */	
	makeBooking:function(req, res) {
		
		var eventId=req.param("eventid");
		 
		Event.findOne(eventId,function(err,event){
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
					
					Booking.create(booking,function(err, booking){
						if (err) {
							return res.negotiate(err);
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
								  	
						    },
						    {
						      to: res.locals.user.email,
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

