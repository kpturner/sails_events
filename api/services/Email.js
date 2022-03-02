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

const emailQueue = [];
let emailQueueTimer = null;

module.exports = {

    compile: function (templateName, data) {
        const path = require('path');
        const fs = require('fs');
        const ejs = require('ejs');
        const pathToTemplate = path.resolve(sails.config.appPath, 'views/emailTemplates');
        const templateString = fs.readFileSync(path.join(pathToTemplate, templateName, 'html.ejs')).toString();
        const template = ejs.render(templateString, data);
        return template;
    },

    sendinblue: function (template, data, opts, cb) {
        const SibApiV3Sdk = require('sib-api-v3-sdk');
        const defaultClient = SibApiV3Sdk.ApiClient.instance;

        // Configure API key authorization: api-key
        defaultClient.authentications['api-key'].apiKey = sails.config.events.sendinblue.apiKey;

        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

        let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail(); // SendSmtpEmail | Values to send a transactional email

        const senderSplit = (opts.from || sails.config.eventemail.from).split(' <');
        const sender = {
            name: senderSplit[0],
            email: senderSplit[1].replace('>', '')
        }

        const format = (addr) => {
            if (typeof addr === 'string') {
                return [{
                    email: addr
                }];
            }
            return addr.map((email) => {
                return {
                    email
                };
            });
        }

        let to = format(opts.to || []);
        let cc = format(opts.cc || []);
        let bcc = format(opts.bcc || []);

        sendSmtpEmail = Object.assign(sendSmtpEmail, {
            sender,
            subject: opts.subject,
            htmlContent: Email.compile(template, data),
            headers: {
                'X-Mailin-custom': 'custom_header_1:custom_value_1|custom_header_2:custom_value_2'
            }
        });

        if (to.length) {
            sendSmtpEmail.to = to;
        }
        if (cc.length) {
            sendSmtpEmail.cc = cc;
        }
        if (bcc.length) {
            sendSmtpEmail.bcc = bcc;
        }

        apiInstance.sendTransacEmail(sendSmtpEmail).then(function (data) {
            sails.log.info('API called successfully. Returned data: ' + data);
            cb(null, data);
        }, function (error) {
            sails.log.error('Sendinblue API call failed sending to ' + JSON.stringify(sendSmtpEmail.to));
            sails.log.error(error);
            cb(error, null);
        });
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

        mailgun.messages().send(payload, function (err, body) {
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
            return Email.enqueueEmail(sails.config.events.smtpApi, template, data, opts, cb);
        } else if (sails.config.events.smtpApi === 'sendinblue') {
            return Email.sendinblue(template, data, opts, cb);
            // return Email.enqueueEmail(sails.config.events.smtpApi, template, data, opts, cb);
        } else {
            return Email.nodemailer(template, data, opts, cb);
        }

    },

    enqueueEmail: function (api, template, data, opts, cb) {
        emailQueue.push({
            api,
            template,
            data,
            opts,
            cb
        });

        if (!emailQueueTimer) {
            emailQueueTimer = setInterval(() => {
                if (emailQueue.length > 0) {
                    try {
                        const email = emailQueue.shift();
                        if (email.api === 'mailgun') {
                          Email.mailgun(email.template, email.data, email.opts, email.cb);
                        } else {
                          if (email.api === 'sendinblue') {
                            Email.sendinblue(email.template, email.data, email.opts, email.cb);
                          }
                        }
                    } catch (err) {
                        sails.log.error(`Email error: ${err}`);
                    }
                }
            }, (1 / sails.config.eventemail.throttleRate) * 6000);
        }
        return true;
    },

};
