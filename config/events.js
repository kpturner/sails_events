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

	// Default skin
	skin:	"skins/defaultskin.css",
    
	// Enter an email address if you want developer(s) to get bcc's on everything
    developer: process.env.DEVELOPER || "kevin@kpturner.co.uk",

	// Email developer when a download is activated
	emailDeveloperOnDownload: false,

	// Maintenance mode?
	maintenance: false,
    
	// Expire session after this many milliseconds
	sessionExpiry:  30 * 60 * 1000,

	// Admins can be a single string or an array, each representing a user name or email address
	admins: ['kturner','kevin@kpturner.co.uk'],
	
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

	// Logo tip
	logoTip: "Provincial website",
	
	// Can multiple bookings be made per user (useful when testing) or should the system present the existing booking if applicable?
	multipleBookings: false,

	// Users can view bookings for an events
	usersCanViewBookings: false,

    // Orders supported by this instance (e.g. {"code":"C","desc":"Craft"},{"code":"RA","desc":"Royal Arch"} )
	// Craft is the default and if no others are added then "Order" is not something that will be prompted for anywhere
	orders: [{"code":"C","desc":"Craft"}],

	// User categories
	userCategories: [],
	
	// Methods of payment
	mops: ['Cheque', 'BACS', 'Cash', 'Paypal'],
	
	// Salutations
	salutations: ['Bro.', 'W.Bro', 'R.W.Bro', 'V.W.Bro', 'M.W.Bro', 'Mr', 'Mrs', 'Ms', 'Miss'],
	
	// Areas
	areas: ['North Central', 'North East', 'Solent', 'South Central', 'South East', 'South West'],

	// Lodge is mandatory
	lodgeMandatory: true,

	// Show lodge year in profile
	lodgeYear: false,

	// Permanent diner?
	permanentDiningList: false,
	
	// Domain (for signup email confirmations)
	domain: "http://squareevents.org",
	
    // Late payment interval
    latePaymentDaemon: (process.env.LATEPAYMENTDAEMON=="0")?false:true,
    
    // Reminder text mode
    reminderTestMode: (process.env.REMINDERTESTMODE=='1')?true:false,
            
	// Late payment interval
	latePaymentInterval: process.env.LATEPAYMENTINTERVAL || 86400000,
	
	// Late payment reminder interval (days)
	latePaymentReminderInterval: 7,

	// Additional info field label
	//additionalInfoLabel: "Sit me with"
	
	// Domains requiring SPAM warning
	spamDomains: {
		"gmail.com":{video:"http://screencast.com/t/goyOqiGM",additionalinfo:"In addition, ensure that /%sender%/ is in your list of contacts."},
		"googlemail.com":{video:"http://screencast.com/t/goyOqiGM",additionalinfo:"In addition, ensure that /%sender%/ is in your list of contacts."},
		"hotmail.com":{additionalinfo:"Unfortunately HOTMAIL may block emails from this application. Please consider using an alternative address."}, 
		"hotmail.co.uk":{additionalinfo:"Unfortunately HOTMAIL may block emails from this application. Please consider using an alternative address."},
	},
	
	// DKIM details to help prevent our emails being flagged as spam
    DKIM: {
      domainName: "squareevents.org", 
      keySelector: "default",
      privateKey: "default.squareevents.org.pem"	
    },
	
};
