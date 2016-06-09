/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */


module.exports = {
	
	/**
	 * Users
	 *
	 * @param {Object} req
	 * @param {Object} res
	*/
	users: function(req, res) {
		res.view('users',{
		  filter: req.session.userFilter,
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
	 * Get all users for editing
     * 
	 * @param {Object} req
	 * @param {Object} res
	 */
	allUsers: function (req, res) {
		
		var filter=req.param('filter');
		req.session.userFilter=filter;
		req.session.bookingFilter="";				
		var where = {};
		
		if (filter && filter.length>0) {
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
					{area: {contains: filter}}, 
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
			).exec(
			function(err, users){
				if (err) {
					sails.log.verbose('Error occurred trying to retrieve users.');
					return res.negotiate(err);
			  	}	
			
			  	// If session refers to a user who no longer exists, still allow logout.
			  	if (!users) {
			    	return res.json({});
			  	}
				  
				return res.json(users);  
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
					areas: sails.config.events.areas,
					form:'userdetails',
					userDetails:user
				})	
			})	
		} 
		else {
			return res.view("userdetails",{
				mode:mode,
				salutations: sails.config.events.salutations,
				areas: sails.config.events.areas,
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
				// Success
				if (user[0].address1==null)
					user[0].address1=""
                if (user[0].address2==null)
					user[0].address2=""
                if (user[0].address3==null)
					user[0].address3=""
                if (user[0].address4==null)
					user[0].address4=""
                if (user[0].postcode==null)
					user[0].postcode=""
                if (user[0].dietary==null)
					user[0].dietary=""
				if (user[0].rank==null)
					user[0].rank=""
				if (user[0].phone==null)
					user[0].phone=""
                if (user[0].area==null)
					user[0].area=""
                
				if (!user[0].isVO) 
					user[0].isVO=false
				if (!user[0].isAdmin)
					user[0].isAdmin=false
				if (!user[0].isOrganiser)
					user[0].isOrganiser=false
				// Send confirmation email
				Email.send(
					"profileChanged", {
				            recipientName: user[0].salutation + " " + user[0].firstName,
				            senderName: sails.config.events.title,
			                details: user[0]						  
					    },
					    {
					      to:user[0].email,
						  bcc: sails.config.events.developer || "",
					      subject: sails.config.events.title + " - Your details have been changed by the Administrator"
					    },
					    function(err) {if (err) console.log(err);}
				   )     
				return res.ok();	
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
				return res.ok();	
			})
		}
		
		
	}
	
};

