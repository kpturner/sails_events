/**
 * Email configuration for sails-hook-email
 * (sails.config.email)
 *
 * Override settings in config/env/development.js or config/end/production.js or in config/locals.js
 * using:
 *   email:  {}
 * 
 * 
 * For more information on the Sails logger, check out:
 * https://github.com/balderdashy/sails-hook-email
 * 
 */

module.exports.email = {

	/**
	 * A well known service (if applicable. 
	 * See https://github.com/andris9/nodemailer-wellknown/blob/v0.1.5/README.md#supported-services	
	 */  	 
	//service:	"",
	/**
	 * Authentication object as {user:"...", pass:"..."}
	 */	 
	//auth:		{
	//	user:	"",
	//	pass:	""
	//},
	/**
	 * Custom transporter passed directly to nodemailer.createTransport (overrides service/auth)
	 */
	//transporter:	{
	//	host: 'localhost',
    //	port: 25,
    //	auth: {
    //    	user: 'username',
    //    	pass: 'password'
    //	}
	//},  
	/**
	 * Path to view templates relative to sails.config.appPath (defaults to views/emailTemplates)
	 */
	//templateDir:	"views/emailTemplates",
	/**
	 * Default "from" email address
	 */
	//from:	null,
	/**
	 * Flag indicating whether the hook is in "test mode". In test mode, email options and contents 
	 * are written to a .tmp/email.txt file instead of being actually sent. Defaults to true.
	 */ 
	//testMode:	false,
	/**
	 * If set, all emails will be sent to this address regardless of the to option specified. 
	 * Good for testing live emails without worrying about accidentally spamming people.
	 */
	//alwaysSendTo:	""
};
