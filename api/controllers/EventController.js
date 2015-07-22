/**
 * EventController
 *
 * @description :: Server-side logic for managing events
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
	 
	/**
	 * Get open events
     * Find all events for the current user that are open and not passed closing date
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
			
	},
	
	/**
	 * Get all events for editing
     * 
	 * @param {Object} req
	 * @param {Object} res
	 */
	allEvents: function (req, res) {
		
		var filter=req.param('filter');
								
		Event.find({sort: {date:2,time:2}}).populate('organiser').exec(
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
			
	},
		
	/**
	 * Prepare event for copy/edit/delete
	 */	
	prepareEvent: function(req, res) {
		var action=req.param("action")
	
		console.log(action);
		
		return res.json({})
	
	}
};

