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

    compile: function(templateName, data) {
        const path = require('path');
        const fs = require('fs');
        const ejs= require('ejs');
        const pathToTemplate = path.resolve(sails.config.appPath, 'views/emailTemplates');
        const templateString = fs.readFileSync(path.join(pathToTemplate, templateName, 'html.ejs')).toString();
        const template = ejs.render(templateString, data);
        return template;
    },

    mailgun: function (template, data, opts, cb) {
        const mailgun = require('mailgun-js')(sails.config.events.mailgun);

        const payload = {
            from: opts.from || sails.config.eventemail.from,
            to: opts.to || [],
            cc: opts.cc || [],
            bcc: opts.bcc || [],
            subject: opts.subject,
            html: Email.compile(template, data)
          };

          mailgun.messages().send(payload, function(err, body) {
              cb(err, body)
          });
    },

    nodemailer: function (template, data, opts, cb) {
        // Check to see if we a reusing DKIM.  If not, we can just use sails-hook-email
        // functionality unaugmented

        // Use my localised email hook while waiting for a fix to sails-hook-email
        var hook = "eventemail";
        //var hook="email";
        var transporter = sails.hooks[hook].transporter();
        if (!transporter) {
            sails.log.error('Unable to create mail transporter');
            return;
        }
        if (sails.config.events.DKIM && sails.config.events.DKIM.domainName && !transporter._dkim) {
            var nodemailer = require('nodemailer');
            var nodemailerDKIM = require('nodemailer-dkim');
            var fs = require('fs');

            // Verify keys before attempting to use them.
            // This checks that the configuration is correct and the private key matches the public key listed in DNS
            var dkimOpts = {
                domainName: sails.config.events.DKIM.domainName,
                keySelector: sails.config.events.DKIM.keySelector,
                privateKey: fs.readFileSync(sails.config.events.DKIM.privateKey)
            }
            nodemailerDKIM.verifyKeys(dkimOpts, function (err, success) {
                if (err) {
                    sails.log.debug('Verification failed');
                    sails.log.debug(err);
                } else if (success) {
                    // create reusable transporter object using SMTP transport
                    sails.log.verbose('DKIM verification successful');
                    transporter._dkim = true; // Stops us initialising it again
                    // Tell it to stream correctly with the DKIM header(s)
                    transporter.use('stream', nodemailerDKIM.signer(dkimOpts));
                }
                // Send the email
                sails.hooks[hook].send(template, data, opts, cb);
            });
        }
        else {
            // Send the email
            sails.hooks[hook].send(template, data, opts, cb);
        }
    },

    send: function (template, data, opts, cb) {

       if (sails.config.events.smtpApi === 'mailgun') {
            return Email.mailgun(template, data, opts, cb);
       } else {
            return Email.nodemailer(template, data, opts, cb);
       }

    },


};
