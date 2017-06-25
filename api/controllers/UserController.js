/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */


module.exports = {

	 graph: require('fbgraph'),
	
	/**
	 * Users
	 *
	 * @param {Object} req
	 * @param {Object} res
	*/
	users: function(req, res) {
		var criteria=req.session.userCriteria;
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
			criteria.limit=50;
		}
		if (!criteria.filter) {
			criteria.filter="";
		}
		res.view('users',{
		  criteria: criteria,
		  errors: req.flash('error')
		});  
	}, 
	
	
	/**
	 * Get organisers in name order
	 */	
	organisers:function(req, res) {
		
			 
		User.find({where:{isOrganiser:true},sort:{name:1}}).exec(function(err,organisers){
			 
			if (err) {
				sails.log.verbose('Error occurred trying to retrieve organisers.');
				return res.negotiate(err);
		  	}	
		
		  	// If session refers to a user who no longer exists, still allow logout.
		  	if (!organisers) {
		    	return res.json({});
		  	}
			  
			return res.json(organisers);  
			
		})		
		
	},
	
	/**
	 * Get dcs in name order
	 */	
	dcs:function(req, res) {
		
			 
		User.find({where:{isDC:true},sort:{name:1}}).exec(function(err,dcs){
			 
			if (err) {
				sails.log.verbose('Error occurred trying to retrieve dcs.');
				return res.negotiate(err);
		  	}	
		
		  	// If session refers to a user who no longer exists, still allow logout.
		  	if (!dcs) {
		    	return res.json({});
		  	}
			  
			return res.json(dcs);  
			
		})		
		
	},
	
	/**
	 * Get all users for editing
     * 
	 * @param {Object} req
	 * @param {Object} res
	 */
	allUsers: function (req, res) {
		
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
		req.session.userCriteria=JSON.stringify(criteria);
		req.session.bookingCriteria="{}";	

		// Special case for no data
		if (req.param("nodata")=="1") {
			return res.json({});
		}

		var where = {};
		var pag={
			"page": 	(criteria.page || 1),
			"limit": 	(criteria.limit || 50)
		}
		var filter=criteria.filter;

		// If we are looking for duplicates then pagination will defeat us!
		if (filter=="duplicates") {
			pag.limit=99999999;
		}

		if (filter && filter.length>0 && filter!="duplicates" && filter!="facebook" && filter!="twitter" && filter!="google") {
			where = {
				or: [
					{salutation: {contains: filter}},
					{name: {contains: filter}},
					{surname: {contains: filter}},
					{name: {contains: filter}},	
					{firstName: {contains: filter}},
				 	{rank: {contains: filter}},
					{email: {contains: filter}},
					{dietary: {contains: filter}},
					{lodge: {contains: filter}},
					{lodgeNo: {contains: filter}}, 
					{lodgeYear: {contains: filter}},
					{category: {contains: filter}},  
					{area: {contains: filter}}, 
					{centre: {contains: filter}}, 
				]
			}
			
			// Special value for partially complete registrations
			if (filter.toLowerCase()=="partial") {
				where.or.push({salutation:null})
			}
		}
										
		User.find({
						where: where,
						sort: {
								surname:'asc',
								firstName:'asc'
						}
					}
			) 
			.paginate(pag)
			.exec(
			function(err, users){
				if (err) {
					sails.log.error(err);
					return res.negotiate(err);
			  	}	
			
			  	// If session refers to a user who no longer exists, still allow logout.
			  	if (!users) {
			    	return res.json({});
			  	}
				  
				// If we are looking for duplicates then we have more to do  
				switch (filter) {
					case "duplicates":
						var dups=[];
						async.each(users,function(user,next){
							// For this user, see if there are any others with the same name
							User.find({where:{
									id:	{"!":user.id},
									firstName: 	user.firstName,
									surname: 	user.surname,
								}
							})
							.then(function(usrs){
								if (usrs && usrs.length>0) {
									dups.push(user);
									dups=dups.concat(usrs)
								}
								next();
							})
						},function(err){
							// All done - now strip out duplicate duplicates 
							var duplicates=[];
							_.forEach(dups,function(dp,d){
								var dup=false;
								_.forEach(duplicates,function(already,a){
									if (dp.id==already.id) {
										//sails.log.debug("User '"+dp.name+"' already listed as a duplicate")
										dup=true;
										return false;
									}
								})
								if (!dup) {
									dp.surname=dp.surname+" ("+dp.authProvider+")";
									duplicates.push(dp);
								}							
							})
							return res.json(duplicates); 
						})
						break;
					case "facebook":
						var fb=[];
						_.forEach(users,function(user){
							if (user.authProvider==filter) {
								fb.push(user)
							}
						})
						return res.json(fb);  
						break;
					case "twitter":
						var fb=[];
						_.forEach(users,function(user){
							if (user.authProvider==filter) {
								fb.push(user)
							}
						})
						return res.json(fb);  
						break;
					case "google":
						var fb=[];
						_.forEach(users,function(user){
							if (user.authProvider==filter) {
								fb.push(user)
							}
						})
						return res.json(fb);  
						break;
					default: 
						return res.json(users);
						break;  
				}

				
			}
		)
			
	},
		
	/**
	 * Prepare user for copy/edit/delete
	 */	
	prepareUser: function(req, res) {
		
		var action=req.param("action");
		var userId=req.param("userid");
		var mode=action.substr(0,1).toUpperCase()+action.substr(1);		
		
		// If we have an user id, retrieve it
		if (userId) {
			User.findOne(userId).exec(function(err, user){
				if (err) {
					return res.negotiate(err);	
				}
				// Send the details
				return res.view("userdetails",{
					mode:mode,
					salutations: sails.config.events.salutations,
					areas: Utility.areas(),
					lodgeMandatory: sails.config.events.lodgeMandatory,
					form:'userdetails',
					userDetails:user
				})	
			})	
		} 
		else {
			return res.view("userdetails",{
				mode:mode,
				salutations: sails.config.events.salutations,
				areas: Utility.areas(),
				lodgeMandatory: sails.config.events.lodgeMandatory,
				form:'userdetails',
				userDetails:{}
			})	
		}	
	},
	
	/**
	 * Update user (copy/edit/delete)
	 */	
	updateUser: function(req, res) {
		
		var action=req.param("action");
		var user=req.param("data");
		var userId=user.id;
		
		if (!user.isVO) {
			user.voLodge="";
			user.voLodgeNo="";
			user.voCentre="";
			user.voArea="";
		} 

		// Decide what to do based on the action
		if (action=="edit") {

			// Get the avatar (if applicable) then update			
			Utility.getAvatar(user,function(err,avatar){
				user.gravatarUrl=avatar;
				User.update(userId,user).exec(function(err,user){
					if (err) {
						// If this is a uniqueness error about the email attribute,
						// send back an easily parseable status code.
						if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0]
						&& err.invalidAttributes.email[0].rule === 'unique') {
						return res.genericErrorResponse(409,"Email address is already in use");
						}
						// If this is a uniqueness error about the username attribute,
						// send back an easily parseable status code.
						if (err.invalidAttributes && err.invalidAttributes.username && err.invalidAttributes.username[0]
						&& err.invalidAttributes.username[0].rule === 'unique') {
						return res.genericErrorResponse(410,"User name is already in use");
						}
						// Else unknown error
						return res.negotiate(err)
					}
					sails.controllers.order.updateOtherOrders(userId,req.param("orders"));
					  
					return res.ok();	
				})
			}) 
		}
		else if (action=="delete") {
			// Make sure there are no bookings!
			Booking.find({user:userId}).exec(function(err,bookings){
				if (bookings && bookings.length>0) {
					return res.genericErrorResponse(460,"You cannot delete a user who has made bookings!")
				}
				// Make sure the user is not an event organiser
				Event.find({organiser:userId}).exec(function(err,events){
					if (events && events.length>0) {
						return res.genericErrorResponse(460,"You cannot delete a user who is an event organiser!")
					}
					// Carry on and delete it
					User.destroy(userId).exec(function(err){
						if (err) {
							return res.negotiate(err)
						}
						Order.destroy({user:userId}).exec(function(err){});
						Passport.destroy({user:userId}).exec(function(err){
							return res.ok();	
						})						
					})
				})				
				
			})
		}
		else if (action=="copy" || action=="create") {
			delete user.id;
			User.create(user).exec(function(err,user){
				if (err) {
					// If this is a uniqueness error about the email attribute,
				    // send back an easily parseable status code.
				    if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0]
				      && err.invalidAttributes.email[0].rule === 'unique') {
				       return res.genericErrorResponse(409,"Email address is already in use");
				    }
					// If this is a uniqueness error about the username attribute,
			      	// send back an easily parseable status code.
			      	if (err.invalidAttributes && err.invalidAttributes.username && err.invalidAttributes.username[0]
			          && err.invalidAttributes.username[0].rule === 'unique') {
			          return res.genericErrorResponse(410,"User name is already in use");
			      	}
					// Else unknown error
					return res.negotiate(err)
				}
				sails.controllers.order.updateOtherOrders(user[0].id,req.param("orders"));
				return res.ok();	
			})
		}
		
		
	},

	/**
	 * Mimic a user requested
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	mimicUserRequested: function(req, res) {
		res.view('dashboard',{		
			appUpdateRequested: false,	
			mimicUserRequested: true
		});  		
	}, 
	
	/**
	 * Mimic a user  
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	mimicUser: function(req, res) {
		// Find the user
		User.findOne(req.param("mimicuser"), function (err, user) {
			if (err) {
				return res.negotiate(err)
			}
			if (!user) {
				return res.genericErrorResponse(409,"User not found");
			}
			// Override the user
			res.locals.user = user;
			Passport.findOne({user:user.id},function(err,passport){
				if (err) {
					return res.negotiate(err)
				}
				if (!passport) {
					return res.genericErrorResponse(409,"Passport not found");
				}
				sails.controllers.auth.resetAuth(req,res);
				req.session.passport=passport;
				return res.ok();
			})
			
		}) 
	}, 

};
