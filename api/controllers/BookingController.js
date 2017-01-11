/**
 * BookingController
 *
 * @description :: Server-side logic for managing bookings
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */




module.exports = {

	/**
	 * Payment Deadline
	 */	
	 paymentDeadline: function(event,booking) {
		// Booking payment deadline
		var df = require("dateformat");
		var deadline="N/A";
		if (event.grace && event.grace>0 && !booking.paid) {
			var dl=new Date(booking.bookingDate);
			dl.setDate(dl.getDate()+event.grace);
			//dl=dl.toString();
			//deadline=dl.substr(0,dl.indexOf(":")-2);			
			deadline=df(dl, "ddd, mmm dS, yyyy");
		}
		return deadline;
	 },

	/**
	 * Booking criteria 
	 */	
	criteria: function(req){
		var criteria=req.session.bookingCriteria;
		if (criteria) {
			criteria=JSON.parse(criteria)
		}
		else {
			criteria={}
		}
		if (!criteria.page) {
			criteria.page=1;
		}
		if (!criteria.limit) {
			criteria.limit=99999;
		}
		if (!criteria.filter) {
			criteria.filter="";
		}
		return criteria;
	},

	/**
	 * My bookings
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	myBookings: function(req, res) {
		req.session.myBookings=true;
		req.session.userBookings=false;
		req.session.eventBookings=false;
		res.locals.event={};
		res.locals.selectedUser={};
		res.view('bookings',{			
		  criteria: sails.controllers.booking.criteria(req),
		  myBookings: true,
		  eventBookings: false,
		  userBookings: false,
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
		req.session.userBookings=false;
		res.locals.selectedUser={};
		Event.findOne(req.param("eventid")).populate("organiser").populate("organiser2").exec(function(err,event){
			res.locals.event=event;
			res.view('bookings',{			
			  criteria: sails.controllers.booking.criteria(req),
			  myBookings: false,
			  eventBookings: true,
			  userBookings: false,
			  errors: req.flash('error')
			});  	
		})		
	}, 
	
	/**
	 * User bookings
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	userBookings: function(req, res) {
		req.session.myBookings=false;
		req.session.eventBookings=false;
		req.session.userBookings=true;
		res.locals.event={};
		User.findOne(req.param("userid")).exec(function(err,user){
			if (err) {
				return res.negotiate(err);
			}
			res.locals.selectedUser=user;
			res.view('bookings',{			
			  criteria: sails.controllers.booking.criteria(req),
			  myBookings: false,
			  eventBookings: false,
			  userBookings: true,
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
		var userId=req.param("userid");
		var selectedUserId=req.param("selecteduserid"); //Only populated when an admin is making a booking on behalf of someone else
		var action=req.param("action");
		var mode=(selectedUserId)?"create":"edit";
		if (action)
			mode=action.substr(0,1).toUpperCase()+action.substr(1);	
		var myBookings=(req.param("mybookings"))?true:false;
		var eventBookings=(req.param("eventbookings"))?true:false;
		var userBookings=(req.param("userbookings"))?true:false;
			
		// Private function to process the initiation
		var initialiseBooking=function(event,existingBooking){
			// Now we have to adjust capacity by the number of places booked so far
			var places=0;
			var criteria={};
			criteria.event=event.id;			 
			
			var preparedBooking=function(userForBooking,criteria){
				var potentialDuplicates=[];
				Booking.find(criteria).populate("user").populate("additions").exec(function(err,bookings){
					if (!err) {
						bookings.forEach(function(booking,index){
							places+=booking.places
							// Look for potential duplicates
							if (!sails.config.events.multipleBookings) {
								booking.additions.forEach(function(addition,a){
									if (
											addition.surname.toLowerCase()==userForBooking.surname.toLowerCase()
										&&	addition.firstName.toLowerCase()==userForBooking.firstName.toLowerCase()	
									) {
											if (!addition.lodge || (addition.lodge && userForBooking.lodge && addition.lodge.toLowerCase()==userForBooking.lodge.toLowerCase())) {
												addition.host=booking.user;
												potentialDuplicates.push(addition)	
											}											
									}	
								})	
							}							
						})
						
							
					}
				
					res.locals.event=event;
					// Obscure some fields!
					if (res.locals.event.bypassCode)
						res.locals.event.bypassCode="*redacted";
					res.locals.event.capacity-=places;
					res.locals.booking=existingBooking;
					res.locals.myBookings=myBookings;
					res.locals.eventBookings=eventBookings;
					res.locals.userBookings=userBookings;
					res.locals.mops=sails.config.events.mops;
					res.locals.selectedUserId=(selectedUserId)?selectedUserId:"";
					res.locals.salutations=sails.config.events.salutations;
					res.locals.areas=Utility.areas();
					res.locals.potentialDuplicates=potentialDuplicates;
					res.locals.lodgeMandatory=sails.config.events.lodgeMandatory;
						
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
			
			// Return prepared booking
			if (existingBooking) {
				criteria.id={"!":existingBooking.id} // Exclude the existing booking details from the calcs
				existingBooking.deadline=sails.controllers.booking.paymentDeadline(event,existingBooking);				
				return preparedBooking(existingBooking.user,criteria);
			}
			else {
				if (selectedUserId) {
					User.findOne(selectedUserId)
						.then(function(userForBooking){
							return preparedBooking(userForBooking,criteria);
						})
				}
				else {
					return preparedBooking(res.locals.user,criteria);
				}
			}
			
		}	
		
		
		// User bookings must simply go to a look-a-like of the dashboard, but with a pre-selected user
		if (userBookings && userId) {
			User.findOne(userId).exec(function(err,user){
				if (err) {
					return res.negotiate(err);
				}
				return res.view("userBookings",{
					selectedUser: user
				})
			})
		}
		else {
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
						Event.findOne(existingBooking.event).populate("organiser").populate("organiser2").exec(function(err,event){
							initialiseBooking(event,existingBooking);			
						})					
					}					
				})
			}	
			else {	
				Event.findOne(eventId).populate('organiser').populate("organiser2").exec(function(err,event){
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
							var userId=(selectedUserId)?selectedUserId:req.user.id;
							Booking.findOne({
												event: eventId,
												user:userId
											}).populate('user').exec(function(err, existingBooking) {
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
		}
		
	},
	
	/**
	 * Make booking
	 */	
	makeBooking:function(req, res) {
		
		var eventId=req.param("eventid");
		var bookingId=req.param("bookingId");
		var action=req.param("action");		
		var selectedUserId=req.param("selecteduserid");		
		var bookingRef=null;
        var lodgeRoomArr=[];
				 
		Event.findOne(eventId).populate("organiser").populate("organiser2").exec(function(err,event){
			if (err) {
				return res.negotiate(err);
			}
			
			// Update the user profile
			var user={};
			user.salutation=req.param("salutation");
			user.name=req.param("name");
			user.surname=req.param("surname");
			user.firstName=req.param("firstName");
			user.lodge=req.param("lodge");
			user.lodgeNo=req.param("lodgeNo");
			user.centre=req.param("centre");
			user.area=req.param("area");
			user.isVO=req.param("isVO");
			user.voLodge=req.param("voLodge");
			user.voLodgeNo=req.param("voLodgeNo");
			user.voCentre=req.param("voCentre");
			user.voArea=req.param("voArea");
			user.rank=req.param("rank");
			user.dietary=req.param("dietary");
			user.email=req.param("email");
            user.address1=req.param("address1");
            user.address2=req.param("address2");
            user.address3=req.param("address3");
            user.address4=req.param("address4");
            user.postcode=req.param("postcode");
			if (req.param("phone"))
				user.phone=req.param("phone");
			var linkedBookings=req.param("linkedBookings");

			// Sort out placeholders
			_.forEach(linkedBookings,function(lb,l){
				if (lb.surname.toLowerCase()=="*placeholder*") {
					lb.firstName=(l+1).toString();
				}
			})
			
			/**
			 * Private function to create booking
			 */
			var bookIt=function(userId,existingBooking){
				User.update(userId,user).exec(
					function(err,users) {
						if (err) {
							sails.log.error(err);
							// If this is a uniqueness error about the email attribute,
							// send back an easily parseable status code.
							if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0]
								&& err.invalidAttributes.email[0].rule === 'unique') {
								return res.genericErrorResponse(409,"Email address is already in use");
							}							
							return res.negotiate(err);
						}
						
						// User updated
						user=users[0];
						if (!req.session.eventBookings && !req.session.userBookings) {
							req.user=users[0];
							res.locals.user=req.user;	
						}					
						
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
									if (existingBooking) {
										_.extend(booking, existingBooking);
									}
                                    else {
                                         booking.createdBy=req.user.id; 
                                         booking.bookingDate=new Date();   
                                    }
									booking.user=user.id;
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
									
									if(req.session.eventBookings || req.session.userBookings) {
										booking.amountPaid=req.param("amountPaid");
										booking.paid=req.param("paid");
										booking.mop=req.param("mop");	
										booking.tableNo=req.param("tableNo");
									}
									else {
										if (!existingBooking) {
											// New booking
											booking.amountPaid=0;
											booking.paid=false;	
											booking.mop=null;	
											booking.tableNo=null;
										}																	
									}
									
									//console.log(bookingRef)
									
									// Use pre-existing booking ref if it exists
									if (bookingRef)
										booking.ref=bookingRef; 
										
									
									Booking.create(booking,function(err, booking){
										if (err) {
											sails.log.error(err);
											return res.negotiate(err);
										}
											
                                        // Update and persist lodge room array for new bookings
                                        if (!existingBooking && lodgeRoomArr.length>0) {
                                            _.forEach(lodgeRoomArr,function(lr,l){
                                                lodgeRoomArr[l].booking=booking.id
                                            })
                                            LodgeRoom.create(lodgeRoomArr).exec(function(){})
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
												if (!linkedBooking.area)
													linkedBooking.area=""
												if (!linkedBooking.centre)
													linkedBooking.centre=""
												//LinkedBooking.create(linkedBooking).exec(function(err,lb){
												//	if (err)
												//		console.log(err)	
												//})
											})
                                            LinkedBooking.create(linkedBookings).exec(function(err,lb){
												if (err){
													sails.log.error(err);
												}	
											    else {
                                                    if (existingBooking) {
                                                        existingBooking.additions=linkedBookings;
														existingBooking.user=user;
                                                        lodgeRoom(existingBooking);	
                                                    }
                                                }	
                                            })
										}				 						
										var finalise=function(){
											// If the user has previously sent an apology, delete it
											Apology.destroy({event:booking.event,user:booking.user}).exec(function(err, deleted){
												if (!err) {
													//console.log(deleted)
												}
											})								
											
											// If this is the user making a booking, send them a confirmation email	
											if(!req.session.eventBookings && !req.session.userBookings && user.email) {
												var formattedDate=event.date.toString();
												formattedDate=formattedDate.substr(0,formattedDate.indexOf("00:00:00"));
												
												// Booking payment deadline
												var deadline=sails.controllers.booking.paymentDeadline(event,booking);		
												
												var updated = "";
												var subject = "";
												if (!event.regInterest) {
													subject="Event booking confirmation";
												}
												else {
													subject="Event interest confirmation";
												}
												if (bookingId) {
													updated=' has been updated';
													if (event.regInterest) {
														subject='Event interest update confirmation'
													}
													else {
														subject='Event booking update confirmation'
													}													
												}	
												Email.send(
													"bookingConfirmation",
													{
													recipientName: Utility.recipient(user.salutation,user.firstName,user.surname),
													senderName: sails.config.events.title,
															updated: updated,
															regInterest: event.regInterest,
															eventFree: event.free,
															eventName: event.name,
															eventDate: formattedDate,
															eventTime: event.time,
                                                            eventAdditionalInfo: event.additionalInfo,
															eventVenue: event.venue.replace(/[\n\r]/g, '<br>'),
															eventOrganiser: event.organiser.name,
															organiserEmail: event.organiser.email,
															organiserContactNo: event.organiser.phone || "",
															eventBlurb: (event.blurb || "n/a").replace(/[\n\r]/g, '<br>'),
															eventMenu: (event.menu || "n/a").replace(/[\n\r]/g, '<br>'),
															eventDressCode: (event.dressCode || "n/a").replace(/[\n\r]/g, '<br>'),
															email: user.email,
                                                            salutation: user.salutation || "",
                                                            firstName: user.firstName || "",
                                                            surname: user.surname || "",
                                                            addressReqd: event.addressReqd,
                                                            address1: user.address1 || "",
                                                            address2: user.address2 || "",
                                                            address3: user.address3 || "",
                                                            address4: user.address4 || "",
                                                            postcode: user.postcode || "",
                                                            phone: user.phone || "",
															lodge: user.lodge || "",
															lodgeNo: user.lodgeNo || "",
															centre: user.centre || "",																
															area: user.area || "",															
															rank: user.rank || "",
															voReqd: event.voReqd,
															isVO: user.isVO,
															voLodge: user.voLodge || "",
															voLodgeNo: user.voLodgeNo || "",
															voCentre: user.voCentre || "",
															voArea: user.voArea || "",
															dietary: user.dietary || "",
															bookingRef: bookingRef,
															info: (booking.info || "n/a").replace(/[\n\r]/g, '<br>'),  
															places: booking.places,
															linkedBookings: linkedBookings,
															paymentDetails: (event.paymentDetails || "n/a").replace(/[\n\r]/g, '<br>'),
															total: (booking.places * event.price),
															deadline: deadline,
													},
													{
													from: event.name + ' <'+sails.config.events.email+'>',
													to: user.email,
													bcc: [event.organiser.email || "",sails.config.events.developer || ""],
													subject: subject
													},
													function(err) {
														//err={"foo":"bar"};
														if (err) {
															var errStr;
															if (typeof err=="string")
																errStr=err
															else
																errStr=JSON.stringify(err)
															sails.log.error("Emailing error: "+errStr);
															// Try to inform the developer
															if (sails.config.events.developer) {
																setTimeout(function(){
																	try {
																		Email.send(
																			"diagnostic",
																			{
																				err:errStr
																			},
																			{
																				to: sails.config.events.developer,
																				subject: "Email failure"
																			},
																			function(){}
																		)	
																	}
																	catch(e) {
																		// No dice!
																	}
																},10)
															}
														};
													}
												)    		
											
											}
											
											// Return to caller with complete booking info
											return res.json(booking);
													
										} 
										 
										// If we don't have a booking ref, create and update now.
										// Why on earth are we doing this now rather than before we create the
										// booking??  You may well ask - but the reason is that prior to 
										// creating the Event.incrementLastBookingRef function, we used the 
										// incrementally generated key to the new booking (the "id") in the 
										// booking reference, so we had to create the booking first.  
										// The code is still in the same place so that we can fall back to that 
										// method if the new atomic function fails for some reason (paranoia)
										if (!bookingRef) {											
											Event.incrementLastBookingRef(event.id,function(err, updatedEvent){
												if (!err) {
													bookingRef=updatedEvent.code+updatedEvent.lastBookingRef.toString()
												}
												else {
													// Use the original event object as the update failed
													bookingRef=event.code+booking.id.toString();
													// Email developer for comfort
													try {
														if (sails.config.events.developer) {
														Email.send(
																"diagnostic",
																{
																	err:"Booking id resorted to original method "+bookingRef
																},
																{
																	to: sails.config.events.developer,
																	subject: "Booking id resorted to original method "+bookingRef
																},
																function(){}
															)
														}						
													}
													catch(e) {}								
												}
												// Update the booking ref
												Booking.update(booking.id,{ref:bookingRef}).exec(function(){});
												booking.ref=bookingRef;
												// Finalise booking
												finalise();								
											})											
										} 												 
										else {
											// Finalise booking
											finalise();
										}
									
										
										
									})
								}
                                
                                function lodgeRoom(existingBooking,cb) {
                                    // If we don't have a booking id its a simple case of writing out the details as they are                                    
                                    if (!existingBooking) {
                                        var lr={
                                            event:eventId,
                                            salutation:user.salutation,
                                            surname:user.surname,
                                            firstName:user.firstName,
                                            rank:user.rank,
                                            cancelled:false,
                                        }
                                        lodgeRoomArr.push(lr);
                                        _.forEach(linkedBookings,function(lb,l){
                                            var lr={
                                                event:eventId,
                                                salutation:lb.salutation,
                                                surname:lb.surname,
                                                firstName:lb.firstName,
                                                rank:lb.rank,
                                                cancelled:false,
                                            }
                                            lodgeRoomArr.push(lr);
                                        })
                                        if (cb) cb();
                                    }
                                    else {
                                        // Get the existing lodge room data
                                        var elrd=[];
                                        existingMain=false;
                                        LodgeRoom.find({event:eventId,booking:existingBooking.id}).exec(function(err,elrds){
                                            if (!err && elrds) {
                                                // Flag any that are no longer on the booking as cancelled
                                                elrd=elrds;
                                                _.forEach(elrd,function(elr,l){
                                                    var found=false;
                                                    if (elr.surname.toLowerCase()==existingBooking.user.surname.toLowerCase() && elr.firstName.toLowerCase()==existingBooking.user.firstName.toLowerCase()) {
                                                        found=true;
                                                        existingMain=true;
                                                    }
                                                    else {
                                                        _.forEach(existingBooking.additions,function(eba,a){
                                                            if (eba.surname.toLowerCase()==elr.surname.toLowerCase() && eba.firstName.toLowerCase()==elr.firstName.toLowerCase()) {
                                                                found=true;
                                                                return false;
                                                            }
                                                        })    
                                                    }                                                    
                                                    if (!found) {
                                                        LodgeRoom.update(elr.id,{cancelled:true}).exec(function(){})
                                                    }
                                                    else {
                                                        LodgeRoom.update(elr.id,{cancelled:false}).exec(function(){})
                                                    }
                                                })                                                
                                            }
                                            // Add any that did not exist before
                                            if (!existingMain) {
                                                var lr={
                                                    event:eventId,
                                                    booking:existingBooking.id,
                                                    salutation:existingBooking.user.salutation,
                                                    surname:existingBooking.user.surname,
                                                    firstName:existingBooking.user.firstName,
                                                    rank:existingBooking.user.rank,
                                                    cancelled:false,
                                                }
                                                LodgeRoom.create(lr).exec(function(){})
                                            }          
                                            _.forEach(existingBooking.additions,function(eba,a){
                                                var found=false;
                                                _.forEach(elrd,function(elr,l){
                                                    if (eba.surname.toLowerCase()==elr.surname.toLowerCase() && eba.firstName.toLowerCase()==elr.firstName.toLowerCase()) {
                                                        found=true;
                                                        return false;
                                                    }
                                                })
                                                if (!found) {
                                                    var lr={
                                                        event:eventId,
                                                        booking:existingBooking.id,
                                                        salutation:eba.salutation,
                                                        surname:eba.surname,
                                                        firstName:eba.firstName,
                                                        rank:eba.rank,
                                                        cancelled:false,
                                                    }
                                                    LodgeRoom.create(lr).exec(function(){})
                                                }
                                            })
                                            if (cb) cb(); 
                                        })  
                                    }                                    
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
                                    lodgeRoom(null,processBooking);
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
			
			/**
			 *  Private function to check and create the booking
			 */
			var checkAndbookIt=function(userId){
				// Check existing booking before continuing
				Booking.findOne({
									event: eventId,
									user:userId
								}).populate("additions").populate("user").exec(function(err, existingBooking) {
					if (existingBooking) {
						if (existingBooking.id==bookingId) {
							// OK
							return bookIt(userId,existingBooking);
						}
						else {
							if (!sails.config.events.multipleBookings) {
								return res.genericErrorResponse("460","Booking failed. This user is already booked in to the event")
							}
							else {
								// OK
								return bookIt(userId,existingBooking);
							}	
						}						
					}
					else {
						// OK
						return bookIt(userId);
					} 
				})				
					
			} 
			/********************************************* */
			
			// We need to decide if we are using the current user (normal booking) or if we 
			// are in "create" mode where the user may or may not exist yet
			if (action=="create") {
				if (selectedUserId) {
					// Administrator making booking on behalf of another user
					checkAndbookIt(selectedUserId);	
				}
				else {
					// Does the user exist already (with this email address?)
					if (user.email) {
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
									checkAndbookIt(newUser.id)
								})
							}
							else {
								checkAndbookIt(existingUser.id);
							}
						})	
					}
					else {
						// No email provided so we must create a dummy user regardless
						user.authProvider="dummy";
						User.create(user).exec(function(err, newUser){
							if (err) {
								//!Ouch!
								sails.log.error('res.genericErrorResponse() :: Sending '+errorCode+': '+errorMsg+' response');
								return res.genericErrorResponse("455","Booking failed. Attempt to create new user failed!")
							}
							checkAndbookIt(newUser.id)
						})
					}					
				}				
			}
			else {
				if (bookingId) {
					// Rebook for existing user
					Booking.findOne(bookingId).exec(function(err,booking){
						bookingRef=booking.ref;
						checkAndbookIt(booking.user);	
					})
				}
				else {
					// Book for current user
					checkAndbookIt(res.locals.user.id);	
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
		Booking.find(where).populate('user').populate("additions")
			.exec(function(err,bookings){
				if (err) {
					console.log(err)
				}
				// Traverse the bookings and analyse each additional booking
				if (bookings) {
					bookings.forEach(function(booking,b){
						// Check the main bookee first
						linkedBookings.forEach(function(ob,m){
							if (ob.surname.toLowerCase()!="*placeholder*") {
								if (
										booking.user.surname.toLowerCase()==ob.surname.toLowerCase()
									&&	booking.user.firstName.toLowerCase()==ob.firstName.toLowerCase()	
								) {
										if (!booking.user.lodge || (booking.user.lodge && ob.lodge && booking.user.lodge.toLowerCase()==ob.lodge.toLowerCase()))
											duplicates.push(ob)
								}	
							}							
						})
						// Additions		
						booking.additions.forEach(function(lb,l){
							if (lb.surname.toLowerCase()!="*placeholder*") {
								// Possible duplicate?
								linkedBookings.forEach(function(ob,m){
									if (
											lb.surname.toLowerCase()==ob.surname.toLowerCase()
										&&	lb.firstName.toLowerCase()==ob.firstName.toLowerCase()	
									) {
											if (!lb.lodge || (lb.lodge && ob.lodge && lb.lodge.toLowerCase()==ob.lodge.toLowerCase()))
												duplicates.push(ob)
									}	
								})			
							}										
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
		
		var criteria=req.param('criteria');
		if (criteria) {
			try {
				criteria=JSON.parse(criteria)
			}
			catch(e) {
				criteria={}
			}
		}
		else {
			criteria={}
		}
		req.session.bookingCriteria=JSON.stringify(criteria);
		req.session.userCriteria="{}";	
		var download=req.param('download');
								
		var where = {};
		where.user=req.user.id;
		var pag={
			"page": 	(criteria.page || 1),
			"limit": 	(criteria.limit || 99999)
		}
		var filter=criteria.filter;
				
		if (filter && filter.length>0) {
			where.or= 	[
							{event:{name: {contains: filter}}},
							{event:{venue: {contains: filter}}},
							{event:{blurb: {contains: filter}}},
							{ref: {contains: filter}},
						]
			if (filter.toLowerCase()=="paid") {
				where.or.push({paid:true})
			}
			if (filter.toLowerCase()=="unpaid" || filter.toLowerCase()=="late") {
				where.or.push({paid:false});
				where.or.push({paid:null})
			}
		}	
		Booking.find({
						where: where,
						// NOTE: Sorting by date/time of the foreign "event" table as shown below does not appear to work at all.
						//       We will have to sort it after getting the data set
						sort: {
								event: {
									date:'desc',
									time:'desc'
								}		
						}
					}
			)			
			.populate('event').populate('additions',{sort:{surname:'asc'}}) 
			.paginate(pag)
			.exec(function(err, bookings){
				if (err) {
					sails.log.verbose('Error occurred trying to retrieve bookings.');
					return res.negotiate(err);
			  	}	
				  
				// If we only want late bookings, filter the list
				if (filter && filter.toLowerCase()=="late") {
					bookings=sails.controllers.booking.filterLate(bookings);
				}  
				
				// Sort response by user surname and first name
				bookings.sort(Utility.jsonSort("event.date", true));
				  
				if (download) {	
					sails.controllers.booking.download(req, res, req.user.username, false, false, bookings, req.user);					
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
				
		var criteria=req.param('criteria');
		if (criteria) {
			try {
				criteria=JSON.parse(criteria)
			}
			catch(e) {
				criteria={}
			}
		}
		else {
			criteria={}
		}
		req.session.bookingCriteria=JSON.stringify(criteria);
		req.session.userCriteria="{}";	
		var download=req.param('download');
								
		var where = {};
		where.event=req.param("eventid");

		var pag={
			"page": 	(criteria.page || 1),
			"limit": 	(criteria.limit || 99999)
		}
		var filter=criteria.filter; 

		if (filter && filter.length>0) {
			where.or= 	[
							{user:{surname: {contains: filter}}},
							{user:{firstName: {contains: filter}}},
							{user:{lodge: {contains: filter}}},
							{user:{email:{contains: filter}}},
							{user:{lodgeNo: {contains: filter}}},
							{ref: {contains: filter}},
						
						]
			if (filter.toLowerCase()=="paid") {
				where.or.push({paid:true})
			}
			if (filter.toLowerCase()=="unpaid" || filter.toLowerCase()=="late") {
				where.or.push({paid:false});
				where.or.push({paid:null})
			}
		}
			
		var getBookings=function(req, res, grace) {
					
			
			Booking.find({
							where:  where,	
                            sort:   "createdAt",						
							// NOTE: Sorting by the surname/name of the foreign "user" table as shown below does not appear to work at all.
							//       We will have to sort it after getting the data set 
							//sort: {
							//		user: {
							//			surname:'asc',
							//			firstName:'asc'
							//		}		
							//}
						}
				)
				.populate('user').populate('additions',{sort:{surname:'asc'}}) // Sorting a "populate" by more than one field doesn't seem to work. You get no results at all.		
				.paginate(pag)
				.exec(function(err, bookings){
					if (err) {
						sails.log.verbose('Error occurred trying to retrieve bookings.');
						return res.negotiate(err);
				  	}	
									 
					// If we only want late bookings, filter the list
					if (filter && filter.toLowerCase()=="late") {
						bookings=sails.controllers.booking.filterLate(bookings,grace);
					}    
					
					// Sort response by user surname (case insensitive) unless it is for a download, in which
                    // case we will sort it later in the download function
					// BIG HAIRY NOTE:  If we are using pagination this will be confusing.  For example, we may get the 
					//                  first page of 10 and that will be in "createdAt" order and then we will sort that 
					//                  set by surname.  So what you might see in the first 10 records on an unpaginated
					//                  set might be different to what you see in a paginated set
                    if (!download) {
					   bookings.sort(Utility.jsonSort("user.surname", false, function(a){return (a && typeof a=="string"?a.toUpperCase():a)}))
					} 
					  		
					if (download) {					
						Event.findOne(req.param("eventid")).exec(function(err,event){
							sails.controllers.booking.download(req, res, event.code, event.addressReqd, event.voReqd, bookings);		
						})									
					}
					else {
						// If session refers to a user who no longer exists, still allow logout.
					  	if (!bookings) {
					    	return res.json({});
					  	}
						  
						return res.json(bookings);  	
					}			  	
				})
		}	
		
		// Do we need to filter late bookings?
		if (filter && filter.toLowerCase()=="late") {
			// We need to know the grace period from the event
			Event.findOne(req.param("eventid")).exec(function(err,event){
				if (err) {
					sails.log.error(err);
					return res.json({});
				}
				getBookings(req,res,event.grace)
			})
		}
		else {
			getBookings(req,res)
		}									
		
			
	},
	
	/**
	 * Get all user bookings  
     * 
	 * @param {Object} req
	 * @param {Object} res
	 */
	allUserBookings: function (req, res) {
		
		var criteria=req.param('criteria');
		if (criteria) {
			try {
				criteria=JSON.parse(criteria)
			}
			catch(e) {
				criteria={}
			}
		}
		else {
			criteria={}
		}
		req.session.bookingCriteria=JSON.stringify(criteria);
		/////req.session.userCriteria="{}";
		var download=req.param('download');

		var pag={
			"page": 	(criteria.page || 1),
			"limit": 	(criteria.limit || 99999)
		}
		var filter=criteria.filter; 
								
		User.findOne(req.param("userid")).exec(function(err,user){
			if (err) {
				sails.log.verbose('Error occurred trying to retrieve user.');
				return res.negotiate(err);
		  	}	
			var where = {};
			where.user=user.id;			
					
			if (filter && filter.length>0) {
				where.or= 	[
								{event:{name: {contains: filter}}},
								{event:{venue: {contains: filter}}},
								{event:{blurb: {contains: filter}}},
								{ref: {contains: filter}},
							]
				if (filter.toLowerCase()=="paid") {
					where.or.push({paid:true})
				}
				if (filter.toLowerCase()=="unpaid" || filter.toLowerCase()=="late") {
					where.or.push({paid:false});
					where.or.push({paid:null})
				}
			}
											
			Booking.find({
							where: where,
							sort: {
									event: {
										date:'desc',
										time:'desc'
									}		
							}
						}
				)
				.populate('event').populate('additions',{sort:{surname:'asc'}})
				.paginate(pag)				 
				.exec(function(err, theBookings){
					if (err) {
						sails.log.verbose('Error occurred trying to retrieve bookings.');
						return res.negotiate(err);
				  	}	
					  
					// Only show bookings for events where the user is the organiser or if they are an admin  
					var bookings=[];
					_.forEach(theBookings,function(booking){
						if (Utility.isAdmin(req.user,booking.event)) {
							bookings.push(booking)
						}
					})

					// If we only want late bookings, filter the list
					if (filter && filter.toLowerCase()=="late") {
						bookings=sails.controllers.booking.filterLate(bookings);
					}  
					  
					if (download) {					
						sails.controllers.booking.download(req, res, user.surname.replace(RegExp(" ","g"),"_")+'_'+user.firstName, false, false, bookings, user);					
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
		})
			
	},
	
	/**
	 * Filter bookings so that we only have those that are late in paying
	 */
	filterLate: function(bookings,grace) {
		var bookingsOut=[];
		bookings.forEach(function(booking,i){
			// Calculate the deadline date
			//console.log("Checking booking for "+booking.user.name)
			var g=(grace)?grace:booking.event.grace;
			if (g>0 && booking.bookingDate) {
				var dl=new Date(booking.bookingDate);
				dl.setDate(dl.getDate()+g+1);
				//console.log(dl)
				if (new Date()>dl) {
					//console.log("late")
					bookingsOut.push(booking)
				}	
			}					
		})		
		return bookingsOut;
	},
	
	/**
	 * Update booking (delete)
	 */	
	updateBooking: function(req, res) {
		
		// The only supported action is "delete" as the rest of booking maintenance is done via
		// the "makeBooking" function.  However, we will stick to our naming convention  
		// in case that changes
		var action=req.param("action");
		var bookingId=req.param("bookingid"); 
		
		// Get all the information first (for the email)
		Booking.findOne(bookingId).populate("user").populate("event").populate("additions").exec(function(err,booking){
			if (err) {
				return res.genericErrorResponse('470','This booking no longer exists!')
			}
			
			User.findOne(booking.event.organiser).exec(function(err, organiser){
			
				if (!organiser)
					organiser={}
			
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
							
				// Booking payment deadline
				var deadline="N/A";
				if (booking.event.grace && booking.event.grace>0 && !booking.paid) {
					var dl=new Date(booking.bookingDate);
					dl.setDate(dl.getDate()+booking.event.grace);
					dl=dl.toString();
					deadline=dl.substr(0,dl.indexOf(":")-2);
					 
				}
				
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
                        // Cancel lodge room details
                        LodgeRoom.update({booking:bookingId},{cancelled:true}).exec(function(){})
                        // Deal with linked bookings
						LinkedBooking.destroy({booking:bookingId}).exec(function(err){
													
							if (bookingId)
								updated=' has been cancelled'
					
							
							if (booking.user.email) {
							
								Email.send(
									"bookingConfirmation",
								    {
								      	recipientName: Utility.recipient(booking.user.salutation,booking.user.firstName,booking.user.surname),
										senderName: sails.config.events.title,
										updated: updated,
										regInterest: booking.event.regInterest,
										eventName: booking.event.name,
										eventFree: booking.event.free,
										eventDate: formattedDate,
										eventTime: booking.event.time,
										eventVenue: booking.event.venue.replace(/[\n\r]/g, '<br>'),
										eventAdditionalInfo: booking.event.additionalInfo,
										eventOrganiser: organiser.name || "",
										organiserEmail: organiser.email || "",
										organiserContactNo: organiser.phone || "",
										eventBlurb: (booking.event.blurb || "").replace(/[\n\r]/g, '<br>'),
										eventMenu: (booking.event.menu || "").replace(/[\n\r]/g, '<br>'),
										eventDressCode: (booking.event.dressCode || "").replace(/[\n\r]/g, '<br>'),
										addressReqd: booking.event.addressReqd,
										address1: booking.user.address1 || "",
										address2: booking.user.address2 || "",
										address3: booking.user.address3 || "",
										address4: booking.user.address4 || "",
										postcode: booking.user.postcode || "", 
										phone: booking.user.phone || "",  
										email: booking.user.email,
										lodge: booking.user.lodge || "",
										lodgeNo: booking.user.lodgeNo || "",
										salutation: booking.user.salutation || "",
										centre: booking.user.centre,
										area: booking.user.area || "",
										voReqd: booking.event.voReqd,
										isVO: booking.user.isVO,
										voLodge: booking.user.voLodge || "",
										voLodgeNo: booking.user.voLodgeNo || "",
										voCentre: booking.user.voCentre || "",
										voArea: booking.user.voArea || "",
										surname: booking.user.surname || "",
										firstName: booking.user.firstName || "",
										rank: booking.user.rank || "",
										dietary: booking.user.dietary || "",
										bookingRef: booking.ref,
										info: (booking.info || "").replace(/[\n\r]/g, '<br>'),  
										places: booking.places,
										linkedBookings: linkedBookings,
										paymentDetails: (booking.event.paymentDetails)?booking.event.paymentDetails.replace(/[\n\r]/g, '<br>'):"",
										total: (booking.places * booking.event.price),
										deadline: deadline
								    },
								    {
								      from: booking.event.name + ' <noreply@squareevents.org>',
									  to: booking.user.email,
									  bcc: [organiser.email || "",sails.config.events.developer || ""],
								      subject: booking.event.regInterest?"Event interest cancellation confirmation":"Event booking cancellation confirmation"
								    },
								    function(err) {if (err) console.log(err);}
							   	)    			
							
							}
							
								
							return res.ok();	
						})						
					})
						 
				}
				else if (action=="copy" || action=="create") {
					// Not supported
				}
				
			})			
			
		})	
		
	},
	
    
    /**
     * Transfer bookings
     */
    transferBookings: function(req, res) {
        var from=req.param("id");
        var to=req.param("newuser");
		var booking=req.param("booking");
        
        // Here we are going to build an array of promises for each update and only return 
        // to the client when .all() the updates are complete
        var updates=[];
		var criteria={};
		if (booking) {
			criteria.id=booking;
		}
		else {
			criteria.user=from;
		}
        Booking.find(criteria)
            .then(function(bookings){
                bookings.forEach(function(booking,b){
                    updates.push(
                         Booking.update(booking.id,{user:to})  
                            .then(function(bookingArr){
                                //console.log("Updated "+bookingArr[0].id) 
                            })      
                    )
                })               
                return updates;
            })
            .all()
                .then(function(update){
                    //console.log("All done")
                    return res.ok()
                })
            .catch(function(err){
                return res.negotiate(err);
            })
    },
    
	/**
	 * Process late payers
	 */
	 processLatePayers: function(){
        var info="Processing late payers..."; 
		sails.log.debug(info);  
		Utility.diagnosticEmail(info,"Late payment daemon");		
		// Get a list of open events
		var today=new Date();
		today=new Date(today.setHours(0));
		today=new Date(today.setMinutes(0));
		today=new Date(today.setSeconds(0));
		Event	.find({
					where:	{
								open:true,
								free: false,
								regInterest: false,
								latePaymentChecking:true,
								closingDate: { '>=': today },
								grace: {'>': 0} 
							}, 
					sort: 	{
								date:'desc',
								time:'desc'
							}
					})
				.populate('organiser')
				.populate("organiser2")
				.then(function(events){
					// Get a list of bookings for this event that are late with their payment
					events.forEach(function(event,ev){
						// Format some data for the email
						var formattedDate=event.date.toString();
						formattedDate=formattedDate.substr(0,formattedDate.indexOf("00:00:00"));
						// Get bookings
						Booking.find({
									where: {
										event:event.id,
										or: [{paid:false},{paid:null}]
									}
								})
						.populate('user')			
						.then(function(bookings){
							// Filter bookings so we only have late payers
							bookings=sails.controllers.booking.filterLate(bookings,event.grace); 
							// Also get a list of bookings that will be flagged as late within 48 hours
							if (event.grace>2) {
								var warnings=sails.controllers.booking.filterLate(bookings,(event.grace-2)); 
								if (warnings.length>0) {
									var nw=[];
									warnings.forEach(function(booking,b){
										var reminderDeadline=today;
										if (booking.lastPaymentReminder) {
											reminderDeadline=new Date((booking.lastPaymentReminder).getTime()+(86400000*5));
										}
										if (!booking.lastPaymentReminder || reminderDeadline <= today) {
											nw.push(booking)
										}	
									})
									if (nw.length>0) {
										// Send a list to the organiser warning of bookings that will get late payment reminders within
										// 48 hours
										var to=event.organiser.email; 
										/////if (sails.config.events.reminderTestMode) 
										/////	to=""; 
										Email.send(
											"latePaymentWarning", {
												recipientName: Utility.recipient(event.organiser.salutation,event.organiser.firstName,event.organiser.surname),
												senderName: sails.config.events.title,
                                                reminderTestMode: sails.config.events.reminderTestMode,
												eventDate: formattedDate,
												event: event,
												bookings: nw												
											},
											{
												//to: booking.user.email,
												to: to,
												bcc: sails.config.events.developer || "",
												subject: event.name + " - Late payment reminder warning"
											},
											function(err) {if (err) console.log(err);}
										)	
									}									
								}
							}
                            if (!sails.config.events.reminderTestMode) {
                                // Process late payers
                                bookings.forEach(function(booking,b){
                                    // Only email a reminder if a week has passed since last reminder
                                    var reminderDeadline=today;
                                    if (booking.lastPaymentReminder) {
                                        reminderDeadline=new Date((booking.lastPaymentReminder).getTime()+(86400000*7));									
                                    }
                                    //sails.log.debug(booking.user.name+" reminder deadline "+reminderDeadline);	
                                    if (!booking.lastPaymentReminder || reminderDeadline <= today) {
                                        sails.log.debug("Late booking reminder issued for "+event.name+" for "+booking.user.name+((sails.config.events.reminderTestMode)?" in test mode":" "))
                                        // Update the booking so we don't spam them
                                        var to=booking.user.email;
                                        var cc=(event.organiser.email || "");
                                        // Update the booking whether we are in test mode or not
                                        var howMany=(!booking.remindersSent)?1:booking.remindersSent+1;
                                        Booking.update(booking.id,{
                                                lastPaymentReminder:today,
                                                remindersSent:howMany
                                        }).exec(function(err,booking){});
                                                                
                                        // In test mode, make sure only the developer gets an email
                                        ///if (sails.config.events.reminderTestMode) {
                                        ///    to="";
                                        ///    cc="";
                                        ///}
                                                                            
                                        var dl=new Date(booking.bookingDate);
                                        dl.setDate(dl.getDate()+event.grace);
                                        dl=dl.toString();
                                        var deadline=dl.substr(0,dl.indexOf(":")-2);
                                    
                                        // Send email reminder
                                        Email.send(
                                            "latePaymentReminder", {
                                                recipientName: Utility.recipient(booking.user.salutation,booking.user.firstName,booking.user.surname),
                                                senderName: sails.config.events.title,
                                                eventDate: formattedDate,
                                                event: event,
                                                deadline: deadline,
                                                details: booking												
                                            },
                                            {
                                                //to: booking.user.email,
                                                to: to,
                                                cc: cc,
                                                bcc: sails.config.events.developer || "",
                                                subject: event.name + " - Late payment reminder"
                                            },
                                            function(err) {if (err) console.log(err);}
                                        )     
                                    }
                                })                                        
                            } 
						})
					})
					
				})
					 
	 }, 
	
	/**
	 * Download bookings
	 */
	 download: function(req, res, prefix, addressReqd, voReqd, bookings, user) {
		 
	 	if (!bookings) {
			bookings=[]
		}
		
		// Create basic options
		var options={};
		options.filename=prefix+'_' + ((new Date().getTime().toString())) + '.csv';
		//options.nested=true;
		
		// Build a custom JSON for the CSV
		var data=[];
		var count=0;
		bookings.forEach(function(booking,i){ 
			if (user && !booking.user.surname) {
				booking.user=user
			}
			var amountPaid=booking.amountPaid/booking.places;
			var row={};   
            //if (!user) {
            //    row.seq=parseInt(booking.ref.replace(prefix,""));
            //}      
			count++;
			row.count=count;                  
			row.tableNo=booking.tableNo || "";
			row.ref=booking.ref || "";
			row.salutation=booking.user.salutation || "";
			row.surname=booking.user.surname || "";
			row.firstName=booking.user.firstName || "";
			row.displayName=booking.user.salutation+" "+booking.user.name;
            if (addressReqd) {
                row.address1=booking.user.address1 || "";
                row.address2=booking.user.address2 || "";
                row.address3=booking.user.address3 || "";
                row.address4=booking.user.address4 || "";
                row.postcode=booking.user.postcode || "";
            }
			row.rank=booking.user.rank || "";
			row.lodge=booking.user.lodge || "";
			row.lodgeNo=booking.user.lodgeNo || "";
			row.centre=booking.user.centre || "";
			row.area=booking.user.area || "";
            row.email=booking.user.email || "";
            row.phone=(booking.user.phone)?"Tel: "+booking.user.phone:""; // Using the "Tel:" string stops excel turning it into a meaningless numeric column
			row.dietary=booking.dietary || "";
			row.info=booking.info || "";
			row.places=booking.places;
			row.paid=booking.paid || "";
			row.cost=booking.cost || "";
			row.amountPaid=amountPaid || "";	
            row.creationDate=booking.bookingDate;
			if (voReqd && booking.user.isVO) {
				row.voLodge=booking.user.voLodge;
				row.voLodgeNo=booking.user.voLodgeNo;
				row.voCentre=booking.user.voCentre;
				row.voArea=booking.user.voArea;
			}
            //row.createdAt=booking.createdAt;        
			data.push(row);
			// Add additional places as rows also
			booking.additions.forEach(function(addition,j){
				var row={};
                //if (!user) {
                //    row.seq=parseInt(booking.ref.replace(prefix,""));
                //}    
				count++;
				row.count=count; 
				row.tableNo=booking.tableNo || "";
				row.ref=booking.ref || "";
				row.salutation=addition.salutation || "";
				row.surname=addition.surname || "";
				row.firstName=addition.firstName || "";
				row.displayName=row.salutation+" "+row.firstName+" "+row.surname;
				row.rank=addition.rank || "";
				row.lodge=addition.lodge || "";
				row.lodgeNo=addition.lodgeNo || "";
				row.centre=addition.centre || booking.user.centre || "";
				row.area=addition.area || booking.user.area || "";
				row.dietary=addition.dietary || "";
				row.paid=booking.paid || "";
				row.amountPaid=amountPaid || "";   
                // If the createdAt date is later than the booking date for the main booking, use that for the booking date
                //var ca=new Date(addition.createdAt.getFullYear(), addition.createdAt.getMonth(), addition.createdAt.getDate());
                //var ba=new Date(booking.bookingDate.getFullYear(), booking.bookingDate.getMonth(), booking.bookingDate.getDate());
                //if (ca.getTime()>ba.getTime()) {
                //    row.bookingDate=addition.createAt;   // Use the additional booking creation date  
                //} 
                //else {
                    row.creationDate=booking.bookingDate;   // Use the main booking date    
                //}                          
				//row.createdAt=addition.createdAt;
                data.push(row);
			})
		})
        // Sort by creation date if we are downloading bookings for an event
        //if (!user) {
        //   data.sort(Utility.jsonSort("bookingDate", false))
        //}
        // Re-process the rows and add a sequence number
        //var seq=0;
        //data.forEach(function(row,i){
        //    seq+=1;
        //    row.addedSeq=seq;
        //}); 
        // Go back to original booking ref sequence 
        //if (!user) {
        //    data.sort(Utility.jsonSort("seq", false))
        //}        
		// Send CSV						
		sails.controllers.booking.sendCsv(req, res, data, options)				
	 },
     
     /**
	 * Download lodge room
	 */
	 lodgeRoom: function(req, res) {
        
        
        var options={};
         
        // Get the event
        Event.findOne(req.param("eventid")).exec(function(err,event){
            if (event) {
                var seq=0;
                options.filename=event.name+'_lr_' + ((new Date().getTime().toString())) + '.csv';
                LodgeRoom.find({event:event.id}).sort('createdAt')
					.populate("booking")
					.exec(function(err,data){
                    _.forEach(data,function(d,i){
                        seq++;                        			
                        d.seq=seq;
						// Add the sequence number and remove confusing extras
						d.ref="";
						if (d.booking) {
							d.ref=d.booking.ref;
						}									
						d.rank=(d.rank || "");						
                        d.status=(d.cancelled)?"Cancelled":"";
						delete d.id;
                        delete d.event;
                        delete d.booking;
                        delete d.cancelled;
                    })
                    sails.controllers.booking.sendCsv(req, res, data, options);	
                }) 
            }
            else {
                sails.controllers.booking.sendCsv(req, res, [], options);	
            }
        }) 
         
        		
	 },
	
	/**
	 * Download CSV
	 * https://gist.github.com/jeffskelton3/2b9fc748ec69205694dc
	 */
	sendCsv: function(req, res, data, optionsIn) {

	  var sails = req._sails
	  ,   options = _.extend({},optionsIn)
	  ,   json2csv = require('json2csv')
	  ,   fs = require('fs')
	  ,   download_dir = '.tmp/downloads/'
	  ,   filename = options && options.filename ? options.filename : 'file_' + ((new Date().getTime().toString())) + '.csv'
	  ,   fullpath = download_dir + filename;
	
	  	
	  sails.log.silly('res.csv() :: Sending 200 ("OK") response');
	
		
	  //PUT THE DATA THROUGH THE GAUNTLET...
	
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
	          }
	
	          //delete the file after we are done with it.
	          fs.unlink(fullpath);
	
	        });
	      });
	
	    });
	
	
	
	  });
	  
	}
	 
};

