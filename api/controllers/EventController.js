/**
 * EventController
 *
 * @description :: Server-side logic for managing events
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
	/**
	 * Find all events for the current user that are open and not passed closing date
	 * 
	 */
	/**
	 * Get open events
     *
	 * @param {Object} req
	 * @param {Object} res
	 */
	openEvents: function (req, res) {
		var today=new Date().getDate();
		
		Event.find({where:{open:true,closingDate: { '>': today }}, sort: {date:1,time:1}}).populate('organiser').exec(
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
			
	}
		
	
};

