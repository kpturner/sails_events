/**
 * api/services/Email.js
 *
 * @module        Service
 * @name          Email
 * @memberOf      global
 * @description   Local implementation of sails-hook-email and nodemailer (and plugins)
 * @docs          http://sailsjs.org/#!documentation/services
 * @api           public
 **/

/**
 * Module dependencies
 */


module.exports = {
  
  send: function(template,data,opts,cb) {
     
     // Check to see if we a reusing DKIM.  If not, we can just use sails-hook-email 
     // functionality unaugmented 
     if (sails.config.events.DKIM && !sails.config.email.transporter._dkim) {
        var nodemailer = require('nodemailer');
        var nodemailerDKIM = require('nodemailer-dkim');
        var fs = require('fs');
        
        // Verify keys before attempting to use them.
        // This checks that the configuration is correct and the private key matches the public key listed in DNS        
        var dkimOpts={
            domainName: sails.config.events.DKIM.domainName,
            keySelector: sails.config.events.DKIM.keySelector,
            privateKey: fs.readFileSync(sails.config.events.DKIM.privateKey)
        }
        nodemailerDKIM.verifyKeys(dkimOpts, function(err, success){
                if(err){
                        sails.log.debug('Verification failed');
                        sails.log.debug(err);
                }else if(success){
                        // create reusable transporter object using SMTP transport
                        sails.log.debug('DKIM verification successful');
                        var transporter = nodemailer.createTransport(sails.config.email.transporter);
                        transporter._dkim=true; // Stops us initialising it again
                        // Tell it to stream correctly with the DKIM header(s)
                        transporter.use('stream', nodemailerDKIM.signer(dkimOpts)); 
                        // Override the transporter in the config
                        sails.config.email.transporter=transporter;                
                }
                // Send the email
                sails.hooks.email.send(template,data,opts,cb);     	
        }); 
     } 
     else {
        // Send the email
        sails.hooks.email.send(template,data,opts,cb);     	        
     }
     	
     
  },

   
};