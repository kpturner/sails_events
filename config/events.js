/**
 * Events Management Configuration
 *
 * Override settings in config/env/development.js or config/end/production.js or in config/locals.js
 * using:
 *   events:  {}
 * 
 * 
 */

module.exports.events = {

	// Admins can be a single string or an array, each representing a user name or email address
	// admins: ['user'],
	
	// Can multiple bookings be made per user (useful when testing) or should the system present the existing booking if applicable?
	multipleBookings: false,
	
};