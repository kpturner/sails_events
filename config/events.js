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
    
	// Expire session afterh this many minutes
	sessionExpiry:  30 * 60 * 1000,

	// Admins can be a single string or an array, each representing a user name or email address
	admins: ['kturner'],
	
	// Browser tab title
	title: "Provincial Events",
	
	// Homepage heading
	heading: "Provincial Events",
	
	// Email address
	email: "noreply@squareevents.org",
	
	// Logo
	logo: "/images/provincial/crest.png",
	
	// Logo link
	logoLink: "http://www.hiowmasons.org/",
	
	// Can multiple bookings be made per user (useful when testing) or should the system present the existing booking if applicable?
	multipleBookings: false,
	
	// Methods of payment
	mops: ['Cheque', 'BACS', 'Cash', 'Paypal'],
	
	// Salutations
	salutations: ['Bro.', 'W.Bro', 'R.W.Bro', 'V.W.Bro', 'M.W.Bro', 'Mr', 'Mrs', 'Ms', 'Miss'],
	
	// Areas
	areas: ['North Central', 'North East', 'Solent', 'South Central', 'South East', 'South West'],
	
	// Domain (for signup email confirmations)
	domain: "http://squareevents.org",
	
    // Late payment interval
    latePaymentDaemon: (process.env.LATEPAYMENTDAEMON=="0")?false:true,
    
	// Late payment interval
	latePaymentInterval: 86400000,
	
	// Additional info field label
	//additionalInfoLabel: "Sit me with"
	
	// Domains requiring SPAM warning
	spamDomains: {
		"gmail.com":{video:"http://screencast.com/t/goyOqiGM",additionalinfo:"In addition, ensure that /%sender%/ is in your list of contacts."},
		"googlemail.com":{video:"http://screencast.com/t/goyOqiGM",additionalinfo:"In addition, ensure that /%sender%/ is in your list of contacts."},
		"hotmail.com":{additionalinfo:"In addition, ensure that /%sender%/ is in your list of contacts."}, 
		"hotmail.co.uk":{additionalinfo:"In addition, ensure that /%sender%/ is in your list of contacts."},
	},
	
	// DKIM details to help prevent our emails being flagged as spam
    DKIM: {
      domainName: "squareevents.org", 
      keySelector: "default",
      privateKey: "default.squareevents.org.pem"	
    },
	
};
