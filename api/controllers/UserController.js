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
	
	
};

