/**
 * Authentication Controller
 *
 * This is merely meant as an example of how your Authentication controller
 * should look. It currently includes the minimum amount of functionality for
 * the basics of Passport.js to work.
 */
var AuthController = {



    /**
     * Reset authentication.  Basically removes any additional user information
     * that req.logout() does not cater for
     */
    resetAuth: function (req, res) {
        // Mark the user as logged out for auth purposes
        req.session.authenticated = false;

        // Clear remember me cookie if we are going straight to the homepage, otherwise
        // the remember-me strategy will override any attempt to log back on with a
        // passport instead of a local user.
        res.clearCookie('remember_me');
    },

    /**
     * Privacy policy
     *
     * @param {Object} req
     * @param {Object} res
     */
    privacy: function (req, res) {
        res.view('privacy');
    },

    /**
     * Render the home page
     *
     * @param {Object} req
     * @param {Object} res
     */
    homepage: function (req, res) {
        var strategies = sails.config.passport
            , providers = {};

        // Get a list of available providers for use in your templates.
        Object.keys(strategies).forEach(function (key) {
            if (key === 'local' || key === 'rememberme') {
                return;
            }

            if (strategies[key]) {
                providers[key] = {
                    name: strategies[key].name,
                    icon: strategies[key].icon,
                    klass: strategies[key].klass,
                    label: strategies[key].label,
                    slug: key
                };
            }
        });

        // Clear the user out of the session also
        req.logout();

        // Reset authentication
        AuthController.resetAuth(req, res);

        // Render the `auth/login.ext` view
        var view = "homepage";
        if (sails.config.events.maintenance) {
            view = "maintenance"
        }
        res.view(view, {
            providers: providers
            , errors: req.flash('error')
        });
    },

    /**
     * Log out a user and return them to the homepage
     *
     * Passport exposes a logout() function on req (also aliased as logOut()) that
     * can be called from any route handler which needs to terminate a login
     * session. Invoking logout() will remove the req.user property and clear the
     * login session (if any).
     *
     * For more information on logging out users in Passport.js, check out:
     * http://passportjs.org/guide/logout/
     *
     * @param {Object} req
     * @param {Object} res
     */
    logout: function (req, res) {
        req.logout();

        // Reset authentication
        AuthController.resetAuth(req, res);

        res.redirect('/');
    },

    /**
     * Render the registration page
     *
     * Just like the login form, the registration form is just simple HTML:
     *
        <form role="form" action="/auth/local/register" method="post">
          <input type="text" name="username" placeholder="username">
          <input type="text" name="email" placeholder="Email">
          <input type="password" name="password" placeholder="Password">
          <button type="submit">Sign up</button>
        </form>
     *
     * @param {Object} req
     * @param {Object} res
     */
    register: function (req, res) {
        res.view({
            form: 'signup',
            salutations: sails.config.events.salutations,
            areas: Utility.areas(),
            centres: Utility.centres(),
            lodgeMandatory: sails.config.events.lodgeMandatory,
            errors: req.flash('error')
        });
    },

    /**
     * Dashboard
     *
     * @param {Object} req
     * @param {Object} res
     */
    dashboard: function (req, res) {

        req.session.eventBookings = false;
        res.view('dashboard', {
            appUpdateRequested: false,
            mimicUserRequested: false
        });

    },

    /**
     * Create a third-party authentication endpoint
     *
     * @param {Object} req
     * @param {Object} res
     */
    provider: function (req, res) {
        passport.endpoint(req, res);
    },

    /**
     * Create a authentication callback endpoint
     *
     * This endpoint handles everything related to creating and verifying Pass-
     * ports and users, both locally and from third-party providers.
     *
     * Passport exposes a login() function on req (also aliased as logIn()) that
     * can be used to establish a login session. When the login operation
     * completes, user will be assigned to req.user.
     *
     * For more information on logging in users in Passport.js, check out:
     * http://passportjs.org/guide/login/
     *
     * @param {Object} req
     * @param {Object} res
     */
    callback: function (req, res) {

        function tryAgain(err) {
            //console.log("I am in callback")
            // Only certain error messages are returned via req.flash('error', someError)
            // because we shouldn't expose internal authorization errors to the user.
            // We do return a generic error and the original request body.
            var flashError = req.flash('error')[0];

            if (err && !flashError) {
                req.flash('error', 'Error.Passport.Generic');
            } else if (flashError) {
                req.flash('error', flashError);
            }
            req.flash('form', req.body);

            // If an error was thrown, redirect the user to the
            // login, register or disconnect action initiator view.
            // These views should take care of rendering the error messages.
            var action = req.param('action');

            switch (action) {
                case 'register':
                    res.redirect('/register', { form: 'signup' });
                    break;
                case 'disconnect':
                    res.redirect('back');
                    break;
                default:
                    res.redirect('/homepage');
            }
        }

        passport.callback(req, res, function (err, user, challenges, statuses) {
            //console.log("I am in passport.callback")
            if (err || !user) {
                return tryAgain(challenges);
            }

            req.login(user, function (err) {
                if (err) {
                    return tryAgain(err);
                }

                // Mark the session as authenticated to work with default Sails sessionAuth.js policy
                req.session.authenticated = true;
                req.session.lastRequest = null;

                if (user.authProvider != "local") {
                    var delta = {};
                    delta.lastLoggedIn = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    User.update(user.id, delta).exec(function () { });
                    // Upon successful login, send the user to the default page
                    res.redirect('/');
                }
                else {
                    // Was "Remember me" selected?
                    if (req.param("rememberme")) {
                        var crypto = require('crypto');
                        // Destroy existing tokens for user
                        Token.destroy({ user: user.id }, function () {
                            var token = crypto.randomBytes(64).toString('base64');
                            Token.create({ token: token, user: user.id }, function (err) {
                                if (err) { return next(err); }
                                res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: sails.config.passport.rememberme.maxAge }); // 7 days
                                // Upon successful login, send the user to the default page
                                res.redirect('/');
                            });
                        });
                    }
                    else {

                        // Upon successful login, send the user to the default page
                        res.redirect('/');
                    }
                }


            });
        });
    },

    /**
     * Disconnect a passport from a user
     *
     * @param {Object} req
     * @param {Object} res
     */
    disconnect: function (req, res) {
        passport.disconnect(req, res);
    },

    /**
       * Edit profile
     *
     * @param {Object} req
     * @param {Object} res
      */
    profile: function (req, res) {
        res.view('profile', {
            form: 'profile',
            salutations: sails.config.events.salutations,
            areas: Utility.areas(),
            centres: Utility.centres(),
            errors: req.flash('error'),
            lodgeMandatory: sails.config.events.lodgeMandatory,
            signup: false,
        });
    },


    /**
       * Update profile
     *
     * @param {Object} req
     * @param {Object} res
      */
    updateProfile: function (req, res) {

        // First get the original record for comparison purposes
        // Look up the user record from the database which is
        // referenced by the id in the user session (req.session.me)
        User.findOne(req.user.id).populate("passports").exec(function foundUser(err, currentUser) {
            //if (err) return res.negotiate(err);
            if (err) {
                sails.log.verbose('Error occurred trying to retrieve user.');
                req.session.authenticated = false;
                return res.backToHomePage();
            }

            // If session refers to a user who no longer exists, still allow logout.
            if (!currentUser) {
                sails.log.verbose('Session refers to a user who no longer exists.');
                req.session.authenticated = false;
                return res.backToHomePage();
            }

            // Build the update JSON specifying only the deltas
            var delta = {};

            var profile = req.param("profile");
            for (var field in profile) {
                if (profile[field] === undefined || profile[field] === null) {
                    delta[field] = null;
                } else if (profile[field] != currentUser[field]) {
                    delta[field] = profile[field];
                }
            }

            /*
            // Always treat the email as changed so the gravatar is updated after a social media sign-up
            delta.email=profile.email;
            */

            if (!profile.isVO) {
                delta.voLodge = "";
                delta.voLodgeNo = "";
                delta.voCentre = "";
                delta.voArea = "";
            }

            // Get the avatar
            Utility.getAvatar(profile, function (err, avatar) {
                delta.gravatarUrl = avatar;
                return handlePassword(req, delta);
            })


            function handlePassword(req, delta) {
                if (delta.password) {
                    // Get the existing passport
                    Passport.findOne({ user: req.user.id }, function (err, passport) {
                        if (err) { return res.negotiate(err); }
                        if (!passport) { return res.negotiate(err); }
                        var validator = require('validator');
                        var crypto = require('crypto');
                        var token = crypto.randomBytes(48).toString('base64');

                        Passport.update(
                            passport.id, {
                                password: delta.password,
                                accessToken: token
                            }
                        ).exec(function (err, passport) {
                            if (err) {
                                if (err.code === 'E_VALIDATION') {
                                    //req.flash('error', 'Error.Passport.Password.Invalid');
                                    //return user.destroy(function (destroyErr) {
                                    //  next(destroyErr || err);
                                    //});
                                    return res.genericErrorResponse(411, "Passport password is invalid");
                                }

                            }
                            return updateUser(delta)
                        });
                    });
                }
                else {
                    return updateUser(delta)
                }
            }

            function updateUser(delta) {
                User.update(req.user.id, delta).exec(function afterwards(err, updatedUser) {
                    if (err) {

                        // If this is a uniqueness error about the email attribute,
                        // send back an easily parseable status code.
                        if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0]
                            && err.invalidAttributes.email[0].rule === 'unique') {
                            return res.genericErrorResponse(409, "Email address is already in use");
                        }
                        // If this is a uniqueness error about the username attribute,
                        // send back an easily parseable status code.
                        if (err.invalidAttributes && err.invalidAttributes.username && err.invalidAttributes.username[0]
                            && err.invalidAttributes.username[0].rule === 'unique') {
                            return res.genericErrorResponse(410, "User name is already in use");
                        }
                        // Otherwise, send back something reasonable as our error response.
                        return res.negotiate(err);
                    }
                    sails.controllers.order.updateOtherOrders(updatedUser[0].id, req.param("orders"));
                    // Success
                    for (var field in updatedUser[0]) {
                        if (updatedUser[0][field] === null) {
                            updatedUser[0][field] = "";
                        }
                    }
                    if (!updatedUser[0].isVO)
                        updatedUser[0].isVO = false
                    if (!updatedUser[0].isDC)
                        updatedUser[0].isDC = false
                    if (!updatedUser[0].isAdmin)
                        updatedUser[0].isAdmin = false
                    if (!updatedUser[0].isOrganiser)
                        updatedUser[0].isOrganiser = false
                    if (updatedUser[0].authProvider != "local")
                        updatedUser[0].username = "N/A"
                    var orders = [];
                    _.forEach(req.param("orders"), function (order) {
                        orders.push(order);
                        _.forEach(sails.config.events.orders, function (cfg) {
                            if (order.code == cfg.code) {
                                order.label = (cfg.label) ? cfg.label : "Lodge";
                                order.desc = cfg.desc;
                                return false;
                            }
                        })
                    })

                    // Send confirmation email
                    Email.send(
                        "profileChanged", {
                            timestamp: new Date(),
                            recipientName: Utility.recipient(updatedUser[0].salutation, updatedUser[0].firstName, updatedUser[0].surname),
                            senderName: sails.config.events.title,
                            lodgeYearLabel: sails.config.events.lodgeYearLabel || "Lodge year",
                            details: updatedUser[0],
                            orders: orders
                        },
                        {
                            to: updatedUser[0].email,
                            bcc: (sails.config.events.emailDeveloperOnProfile && sails.config.events.developer) || "",
                            subject: sails.config.events.title + " - Profile updated confirmation"
                        },
                        function (err) {
                            if (err) {
                                sails.log.error("Email sending error: " + err.message);
                            }
                        }
                    )
                    // Logout if the password has changed
                    if (delta.password) {
                        // Wipe out the session (log out)
                        req.logout();
                        // Reset authentication
                        AuthController.resetAuth(req, res);
                        // Either send a 200 OK or redirect to the home page
                        return res.backToHomePage();
                    }
                    else {
                        return res.ok();
                    }
                })

            }

        });
    },


    /**
       * Password reset email
     *
     * @param {Object} req
     * @param {Object} res
      */
    passwordReset: function (req, res) {

        var crypto = require('crypto');

        User.findOne({ email: req.param("email") }).exec(function (err, user) {

            var sendEmail = function (user, resetInstructions, newPassword) {
                // Send confirmation email
                var domain = (sails.config.events.domain) ? sails.config.events.domain : sails.getBaseUrl();
                if (domain.indexOf("http://") < 0) {
                    domain = "http://" + domain;
                }
                Email.send(
                    "passwordReset", {
                        recipientName: Utility.recipient(user.salutation, user.firstName, user.surname),
                        senderName: sails.config.events.title,
                        resetInstructions: resetInstructions,
                        newPassword: newPassword,
                        domain: domain,
                    },
                    {
                        to: user.email,
                        bcc: (sails.config.events.emailDeveloperOnPasswordReset && sails.config.events.developer) || "",
                        subject: sails.config.events.title + " - Password reset"
                    },
                    function (err) { if (err) console.log(err); }
                )
            }

            if (user) {

                Passport.findOne({ user: user.id }).exec(function (err, passport) {

                    if (passport) {
                        var newPassword = "";
                        var resetInstructions = "Your reset instructions are shown below:";

                        if (passport.provider) {
                            resetInstructions = "You originally registered using your " + passport.provider + " account. To log on, simply click the " + passport.provider + " button on the login page.";
                            newPassword = "No new password has been issued as it is not required.";
                            sendEmail(user, resetInstructions, newPassword);
                        }
                        else {
                            // Create new password
                            while (newPassword.length < 8) {
                                var tempPassword = crypto.randomBytes(32).toString('base64');
                                // We only want the first 8 letters of the alphabet
                                for (var i = 0; i < 31; i++) {
                                    if (('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ').indexOf(tempPassword.substr(i, 1)) >= 0) {
                                        newPassword += tempPassword.substr(i, 1);
                                        if (newPassword.length == 8) {
                                            i = 31; //exits loop
                                        }
                                    }
                                }
                            }
                            //var token = crypto.randomBytes(48).toString('base64');
                            Passport.update(passport.id, {
                                password: newPassword
                            }).exec(function (err, passport) {
                                if (err)
                                    console.log(err)
                                else {
                                    newPassword = "Your new temporary password is: " + newPassword;
                                    sendEmail(user, resetInstructions, newPassword);
                                }
                            });

                        }
                        return res.ok();
                    }
                    else {
                        return res.genericErrorResponse(412, "User details not registered in the database");
                    }

                })

            }
            else {
                return res.genericErrorResponse(412, "Email address is not registered in the database");
            }
        });
    },




};

module.exports = AuthController;
