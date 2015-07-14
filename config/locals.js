/**
 * Local configuration overrides (omitted from Git)
 *
 *
 */

module.exports = {

  // Events management details
  events: {
    domain: "kpturner.co.uk:1337"
  },
    
  // Email configuration
  email: {
   //service: "Gmail",
   //auth: {
   //  user:  "kevin.p.turner@googlemail.com",
   //  pass:  "xxxxxxxxxx"
   //},
   /**
	  * Custom transporter passed directly to nodemailer.createTransport (overrides service/auth)
	  */
	 //transporter:	{
   //   host: 'arizona.coraltree.local',
   //   port: 25,
   // 	tls:{rejectUnauthorized: false}
	 //},
    transporter:	{
      host: 'mail.kpturner.co.uk',
      port: 25,
    	tls:{rejectUnauthorized: false},
      auth: {
        user: "events@kpturner.co.uk",
        pass: "klaatuberada"
      }
	 },
   from: 'Events Management <events@kpturner.co.uk>', // sender address
   testMode:  false 
  },
  
  log: {
    //level: 'silly'
  }
  
};
