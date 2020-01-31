/**
 * LinkedBookingController
 *
 * @description :: Server-side logic for managing linked bookings
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
	/**
	 * Get linked bookings
	 */	
	linkedBookings:function(req, res) {
		
		var bookingId=req.param("bookingid");
		
		LinkedBooking.find({booking:bookingId}).exec(function(err,linkedBookings){
			if (err) {
				return res.negotiate(err);
			}
			
			return res.json(linkedBookings);				
			
		})		
		
	},
	
	
};

