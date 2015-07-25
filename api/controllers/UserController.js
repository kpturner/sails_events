/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
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
						
		var where = {};
		
		if (filter && filter.length>0) {
			where = {
				or: [
					{name: {contains: filter}},
					{surname: {contains: filter}},
					{name: {contains: filter}},	
					{firstName: {contains: filter}},
				 	{rank: {contains: filter}},
					{email: {contains: filter}},
					{dietary: {contains: filter}},
					{lodge: {contains: filter}},
					{lodgeNo: {contains: filter}}, 
				]
			}
		}
										
		User.find({
						where: where,
						sort: {
								surname:1,
								firstName:1
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
					userDetails:user
				})	
			})	
		} 
		else {
			return res.view("userdetails",{
				mode:mode,
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
		
				
		// Decide what to do based on the action
		if (action=="edit") {
			User.update(userId,user).exec(function(err,user){
				if (err) {
					return res.negotiate(err)
				}
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
						return res.ok();
					})
				})				
				
			})
		}
		else if (action=="copy" || action=="create") {
			delete user.id;
			User.create(user).exec(function(err,user){
				if (err) {
					return res.negotiate(err)
				}
				return res.ok();	
			})
		}
		
		
	}
	
};

