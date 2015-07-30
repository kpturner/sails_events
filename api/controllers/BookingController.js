/**
 * BookingController
 *
 * @description :: Server-side logic for managing bookings
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var extend = require('node.extend');		


module.exports = {

		
		  
	/**
	 * My bookings
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	myBookings: function(req, res) {
		req.session.myBookings=true;
		req.session.eventBookings=false;
		res.locals.event={};
		res.view('bookings',{			
		  filter: req.session.bookingFilter,
		  myBookings: true,
		  eventBookings: false,
		  errors: req.flash('error')
		});  
	}, 
	
	/**
	 * Event bookings
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	eventBookings: function(req, res) {
		req.session.myBookings=false;
		req.session.eventBookings=true;
		Event.findOne(req.param("eventid")).populate("organiser").exec(function(err,event){
			res.locals.event=event;
			res.view('bookings',{			
			  filter: req.session.bookingFilter,
			  myBookings: false,
			  eventBookings: true,
			  errors: req.flash('error')
			});  	
		})		
	}, 
	
	
	/**
	 * Prepare data for booking
	 */	
	prepareBooking:function(req, res) {
		
		var eventId=req.param("eventid");
		var bookingId=req.param("bookingid");
		var action=req.param("action");
		var mode="edit";
		if (action)
			mode=action.substr(0,1).toUpperCase()+action.substr(1);	
		var myBookings=(req.param("mybookings"))?true:false;
		var eventBookings=(req.param("eventbookings"))?true:false;
			
		// Private function to process the initiation
		var initialiseBooking=function(event,existingBooking){
			// Now we have to adjust capacity by the number of places booked so far
			var places=0;
			var criteria={};
			criteria.event=event.id;
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
				res.locals.eventBookings=eventBookings;
					
				// Get the data for the event and the user and then navigate to the booking view
				if (req.wantsJSON)
					return res.json({
							model:'booking',
							mode: mode
						});
				else
					return res.view("book",{
							model:'booking',
							mode: mode
						});		
			})	
		}	
			
		// If we have a booking id then we are editing the booking from either MyBookings or the admin booking maintenance
		// as opposed to the public dashboard
		if (bookingId) {
			Booking.findOne(bookingId).populate('user').exec(function(err, existingBooking) {
				if (err) {
					return res.genericErrorResponse('470','This booking no longer exists!')
				}
				else {
					if (!existingBooking) {
						return res.view('events',{
								  filter: req.session.eventFilter,
								  errors: req.flash('error')
								});  
					}
					Event.findOne(existingBooking.event).populate("organiser").exec(function(err,event){
						initialiseBooking(event,existingBooking);			
					})					
				}					
			})
		}	
		else {	
			Event.findOne(eventId).populate('organiser').exec(function(err,event){
				if (err) {
					return res.negotiate(err);
				}	
				// Create or edit/delete mode?				
				if (action=="create") {
					initialiseBooking(event);
				}
				else {
					// Has the user already made this booking?  If multiple bookings are allowed, we don't care (treat it as a new booking)
					if (!sails.config.events.multipleBookings) {
						Booking.findOne({
											event: eventId,
											user:req.user.id
										}).exec(function(err, existingBooking) {
							// if there is already a booking for this user the called function will get it, otherwise it will get nada
							initialiseBooking(event,existingBooking);	
						})
					}
					else {
						initialiseBooking(event);
					}					
				}			
			})					
		}	
		
	},
	
	/**
	 * Make booking
	 */	
	makeBooking:function(req, res) {
		
		var eventId=req.param("eventid");
		var bookingId=req.param("bookingId");
		var action=req.param("action");		
		var bookingRef=null;
				 
		Event.findOne(eventId).populate("organiser").exec(function(err,event){
			if (err) {
				return res.negotiate(err);
			}
			
			// Update the user profile
			var user={};
			user.name=req.param("name");
			user.surname=req.param("surname");
			user.firstName=req.param("firstName");
			user.lodge=req.param("lodge");
			user.lodgeNo=req.param("lodgeNo");
			user.rank=req.param("rank");
			user.dietary=req.param("dietary");
			user.email=req.param("email");
			var linkedBookings=req.param("linkedBookings");
			
			/**
			 *  Private function to create the booking
			 */
			var bookIt=function(userId){
				User.update(userId,user).exec(
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
									booking.dietary=user.dietary;
									
									if(req.session.eventBookings) {
										booking.amountPaid=req.param("amountPaid");
										booking.paid=req.param("paid");	
									}
									else {
										booking.amountPaid=0;
										booking.paid=false;	
									}
									
									// Use pre-existing booking ref if it exists
									if (bookingRef)
										booking.ref=bookingRef;
									
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
				 						
										// If we don't have a booking ref, create and update now
										if (!bookingRef) {
											bookingRef=event.code+"/"+booking.id.toString()
											Booking.update(booking.id,{ref:bookingRef}).exec(function(){})
										} 
																		 
										
										var formattedDate=event.date.toString();
										formattedDate=formattedDate.substr(0,formattedDate.indexOf("00:00:00"));
										var updated = "";
										var subject = "Event booking confirmation";
										if (bookingId) {
											updated=' has been updated';
											subject='Event booking update confirmation'
										}
											
										
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
													eventBlurb: event.blurb || "",
													eventMenu: event.menu || "",
													eventDressCode: event.dressCode || "",
												  	email: res.locals.user.email,
												  	lodge: res.locals.user.lodge,
												  	lodgeNo: res.locals.user.lodgeNo,
												  	rank: res.locals.user.rank || "",
												  	dietary: res.locals.user.dietary || "",
												  	bookingRef: bookingRef,
													info: booking.info || "",  
													places: booking.places,
													linkedBookings: linkedBookings,
													paymentDetails: event.paymentDetails
										    },
										    {
										      to: res.locals.user.email,
											  cc: event.organiser.email,
										      subject: subject
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
			} 
			/********************************************* */
			
			// We need to decide if we are using the current user (normal booking) or if we 
			// are in "create" mode where the user may or may not exist yet
			if (action=="create") {
				// Does the user exist already (with this email address?)
				User.findOne({email:user.email}).exec(function(err,existingUser){
					if (err || !existingUser) {
						// Create a dummy user for the booking
						user.authProvider="dummy";
						User.create(user).exec(function(err, newUser){
							if (err) {
								//!Ouch!
								sails.log.error('res.genericErrorResponse() :: Sending '+errorCode+': '+errorMsg+' response');
								return res.genericErrorResponse("455","Booking failed. Attempt to create new user failed!")
							}
							bookIt(newUser.id)
						})
					}
					else {
						bookIt(existingUser.id);
					}
				})
			}
			else {
				if (bookingId) {
					// Rebook for existing user
					Booking.findOne(bookingId).exec(function(err,booking){
						bookingRef=booking.ref;
						bookIt(booking.user);	
					})
				}
				else {
					// Book for current user
					bookIt(res.locals.user.id);	
				}				
			}
			
					
			
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
		var where = {};
		where.event=eventId;
		if (bookingId) {
			where.id={"!":bookingId}
		} 
		// Now we want a list of additional bookings that are recorded against this
		// event, excluding those from this particular booking
		var duplicates=[];
		Booking.find(where).populate("additions")
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
	 * Get all my bookings  
     * 
	 * @param {Object} req
	 * @param {Object} res
	 */
	allMyBookings: function (req, res) {
		
		var filter=req.param('filter');
		req.session.bookingFilter=filter;
		var download=req.param('download');
								
		var where = {};
		where.user=req.user.id;
				
		if (filter && filter.length>0) {
			where.or= 	[
							{event:{name: {contains: filter}}},
							{event:{venue: {contains: filter}}},
							{event:{blurb: {contains: filter}}},
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
			).populate('event').populate('additions',{sort:{surname:1}}) 
			.exec(function(err, bookings){
				if (err) {
					sails.log.verbose('Error occurred trying to retrieve bookings.');
					return res.negotiate(err);
			  	}	
				if (download) {					
					sails.controllers.booking.download(req, res, req.user.username, bookings, req.user);					
				}
				else {
					// If session refers to a user who no longer exists, still allow logout.
				  	if (!bookings) {
				    	return res.json({});
				  	}
					  
					return res.json(bookings);  	
				}			  	
			}
		)
			
	},
	
	/**
	 * Get all event bookings  
     * 
	 * @param {Object} req
	 * @param {Object} res
	 */
	allEventBookings: function (req, res) {
		
				
		var filter=req.param('filter');
		req.session.bookingFilter=filter;
		var download=req.param('download');
								
		var where = {};
		where.event=req.param("eventid");
				
		if (filter && filter.length>0) {
			where.or= 	[
							{user:{surname: {contains: filter}}},
							{user:{firstName: {contains: filter}}},
							{user:{lodge: {contains: filter}}},
							{user:{lodgeNo: {contains: filter}}},
							
						]
			
		}
										
		Booking.find({
						where: where,
						sort: {
								user: {
									surname:1,
									firstName:1
								}		
						}
					}
			).populate('user').populate('additions',{sort:{surname:1}}) // Sorting a "populate" by more than one field doesn't seem to work. You get no results at all.
			.exec(function(err, bookings){
				if (err) {
					sails.log.verbose('Error occurred trying to retrieve bookings.');
					return res.negotiate(err);
			  	}			
				if (download) {					
					Event.findOne(req.param("eventid")).exec(function(err,event){
						sails.controllers.booking.download(req, res, event.code, bookings);		
					})									
				}
				else {
					// If session refers to a user who no longer exists, still allow logout.
				  	if (!bookings) {
				    	return res.json({});
				  	}
					  
					return res.json(bookings);  	
				}			  	
			}
		)
			
	},
	
	/**
	 * Update booking (delete)
	 */	
	updateBooking: function(req, res) {
		
		// The only supported action is "delete" as the rest of booking maintenance is done via
		// the "makeBooking" function.  However, we will stickl to our naming convention rather
		// in case that changes
		var action=req.param("action");
		var bookingId=req.param("bookingid"); 
		
		// Get all the information first (for the email)
		Booking.findOne(bookingId).populate("event").populate("additions").exec(function(err,booking){
			if (err) {
				return res.genericErrorResponse('470','This booking no longer exists!')
			}
			
			// Create linked bookings
			var linkedBookings=booking.additions;
			if (linkedBookings) {
				linkedBookings.forEach(function(linkedBooking,index){
					if (!linkedBooking.rank)
						linkedBooking.rank=""
					if (!linkedBooking.dietary)
						linkedBooking.dietary=""
					if (!linkedBooking.lodge)
						linkedBooking.lodge=""
					if (!linkedBooking.lodgeNo)
						linkedBooking.lodgeNo=""					
				})
			}
						
			var formattedDate=booking.event.date.toString();
						formattedDate=formattedDate.substr(0,formattedDate.indexOf("00:00:00"));
						var updated="";
			
			// Decide what to do based on the action
			if (action=="edit") {
				// Not supported
			}
			else if (action=="delete") {			
				 
				// Carry on and delete it
				Booking.destroy(bookingId).exec(function(err){
					if (err) {
						return res.negotiate(err)
					}
					LinkedBooking.destroy({booking:bookingId}).exec(function(err){
												
						if (bookingId)
							updated=' has been cancelled'
						
						sails.hooks.email.send(
								"bookingConfirmation",
							    {
							      recipientName: res.locals.user.name,
							      senderName: "Events Management",
								  		updated: updated,
										eventName: booking.event.name,
										eventDate: formattedDate,
										eventTime: booking.event.time,
										eventVenue: booking.event.venue,
										eventBlurb: booking.event.blurb || "",
										eventMenu: booking.event.menu || "",
										eventDressCode: booking.event.dressCode || "",
									  	email: res.locals.user.email,
									  	lodge: res.locals.user.lodge,
									  	lodgeNo: res.locals.user.lodgeNo,
									  	rank: res.locals.user.rank || "",
									  	dietary: res.locals.user.dietary || "",
									  	bookingRef: booking.event.code+"/"+booking.id.toString(),
										info: booking.info || "",  
										places: booking.places,
										linkedBookings: linkedBookings,
										paymentDetails: booking.event.paymentDetails
							    },
							    {
							      to: res.locals.user.email,
								  cc: booking.event.organiser.email,
							      subject: "Event booking cancellation confirmation"
							    },
							    function(err) {if (err) console.log(err);}
						   	)    		
							
							return res.ok();	
					})						
				})
					 
			}
			else if (action=="copy" || action=="create") {
				// Not supported
			}
			
		})	
		
	},
	
	/**
	 * Download bookings
	 */
	 download: function(req, res, prefix, bookings, user) {
	 	if (!bookings) {
			bookings=[]
		}
		
		// Create basic options
		var options={};
		options.filename=prefix+'_' + ((new Date().getTime().toString())) + '.csv';
		//options.nested=true;
		
		// Build a custom JSON for the CSV
		var data=[];
		
		bookings.forEach(function(booking,i){
			if (user && !booking.user.surname) {
				booking.user=user
			}
			var row={};
			row.ref=booking.ref;
			row.surname=booking.user.surname;
			row.firstName=booking.user.firstName;
			row.displayName=booking.user.name;
			row.rank=booking.user.rank;
			row.lodge=booking.user.lodge;
			row.lodgeNo=booking.user.lodgeNo;
			row.dietary=booking.dietary;
			row.info=booking.info;
			row.places=booking.places;
			row.paid=booking.paid;
			row.cost=booking.cost;
			row.amountPaid=booking.amountPaid;							
			data.push(row);
			// Add additional places as rows also
			booking.additions.forEach(function(addition,j){
				var row={};
				row.ref=booking.ref;
				row.surname=addition.surname;
				row.firstName=addition.firstName;
				row.displayName=row.firstName+" "+row.surname;
				row.rank=addition.rank;
				row.lodge=addition.lodge;
				row.lodgeNo=addition.lodgeNo;
				row.dietary=addition.dietary;
				data.push(row);
			})
		})
		// Send CSV						
		sails.controllers.booking.sendCsv(req, res, data, options)				
	 },
	
	/**
	 * Download CSV
	 * https://gist.github.com/jeffskelton3/2b9fc748ec69205694dc
	 */
	sendCsv: function(req, res, data, optionsIn) {

	  var sails = req._sails
	  ,   options = extend({},optionsIn)
	  ,   json2csv = require('json2csv')
	  ,   fs = require('fs')
	  ,   download_dir = '.tmp/downloads/'
	  ,   filename = options && options.filename ? options.filename : 'file_' + ((new Date().getTime().toString())) + '.csv'
	  ,   fullpath = download_dir + filename;
	
	  	
	  sails.log.silly('res.csv() :: Sending 200 ("OK") response');
	
		
	  //PUT THE DATA THROGH THE GAUNTLET...
	
	  if(!data){
	    throw new Error('data cannot be null');
	  }
	
	  if(!_.isArray(data)){
	    throw new Error('data must be of type array');
	  }
	
	  var columns = data.length ? _.keys(data[0]) : [];
	
	  // if we made it this far, send the file
	
	  // Set status code
	  res.status(200);
	
	  options.data=data;
	  options.fields=columns;
	
	  json2csv(options, function(err, csv) {
	
	    if (err) { throw err; }
	
	    //make the download dir if it doesnt exist
	    fs.mkdir(download_dir, 0777, function(err){
	      if(err){
	        //we dont care if the directory already exists.
	        if (err.code !== 'EEXIST'){
	          throw err;
	        }
	      }
	
	      //create the csv file and upload it to our directory
	      fs.writeFile(fullpath, csv, function(err) {
	        if (err) throw err;
	        sails.log.silly('file saved to ' + fullpath);
	        res.download(fullpath, filename, function(err){
	          if(err) {
	            throw err;
	            return;
	          }
	
	          //delete the file after we are done with it.
	          fs.unlink(fullpath);
	
	        });
	      });
	
	    });
	
	
	
	  });
	  
	}
	 
};

