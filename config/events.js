/**
 * Event Management Configuration
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
	
	// Browser tab title
	title: "Provincial Events",
	
	// Homepage heading
	heading: "Provincial Events",
	
	// Logo
	logo: "/images/provincial/crest.png",
	
	// Logo link
	logoLink: "http://www.hiowmasons.org/",
	
	// Can multiple bookings be made per user (useful when testing) or should the system present the existing booking if applicable?
	multipleBookings: false,
	
	// Methods of payment
	mops: ['Cheque', 'BACS', 'Cash', 'Paypal'],
	
	// Salutations
	salutations: ['Bro.', 'W.Bro', 'R.W.Bro', 'V.W.Bro', 'M.W.Bro', 'Mr'],
	
	// Areas
	areas: ['North Central', 'North East', 'Solent', 'South Central', 'South East', 'South West'],
	
	// Domain (for signup email confirmations)
	domain: "http://squareevents.org",
	
	// Late payment interval
	latePaymentInterval: 86400000,
	
	// Additional info field label
	//additionalInfoLabel: "Sit me with"
	
};
