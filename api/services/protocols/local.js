var validator = require('validator');
var crypto    = require('crypto');

/**
 * Local Authentication Protocol
 *
 * The most widely used way for websites to authenticate users is via a username
 * and/or email as well as a password. This module provides functions both for
 * registering entirely new users, assigning passwords to already registered
 * users and validating login requesting.
 *
 * For more information on local authentication in Passport.js, check out:
 * http://passportjs.org/guide/username-password/
 */

/**
 * Register a new user
 *
 * This method creates a new user from a specified email, username and password
 * and assign the newly created user a local Passport.
 *
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */
exports.register = function (req, res, next) {
  
  var Gravatar = require('machinepack-gravatar');
  
  // Build the URL of a gravatar image for a particular email address.
	Gravatar.getImageUrl({
		emailAddress: req.param('email'),
		gravatarSize: 400,
		rating: 'g',
		useHttps: true,
	}).exec({
      error: function(err) {
						return res.negotiate(err)
			},
      success: function(gravatarUrl) {
        var name          = req.param('name')
          , email         = req.param('email')
          , username      = req.param('username')
          , password      = req.param('password')
          , lodge         = req.param('lodge')
          , lodgeNo       = req.param('lodgeNo')
          , rank          = req.param('rank')
          , dietary       = req.param('dietary')
          , email         = req.param('email')
          , authProvider  = 'local'
          , lastLoggedIn  = Date.now()
          , gravatarUrl   = gravatarUrl;

          User.create({
							name:  				name,
							username:  		username,
							lodge:				lodge,
							lodgeNo:			lodgeNo,
							rank:				  rank,
							dietary:			dietary,
							email:				email,
              authProvider: authProvider,
							lastLoggedIn: lastLoggedIn,
							gravatarUrl:	gravatarUrl
						},function(err, newUser) {
                if (err) {
                    // If this is a uniqueness error about the email attribute,
				            // send back an easily parseable status code.
				            if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0]
				              && err.invalidAttributes.email[0].rule === 'unique') {
				              return res.genericErrorResponse(409,"Email address is already in use");
				            }
								    // If this is a uniqueness error about the username attribute,
				            // send back an easily parseable status code.
				            if (err.invalidAttributes && err.invalidAttributes.username && err.invalidAttributes.username[0]
				              && err.invalidAttributes.username[0].rule === 'unique') {
				              return res.genericErrorResponse(410,"User name is already in use");
				            }
                }
               
                
                // Generate passport
                // Generating accessToken for API authentication
                var token = crypto.randomBytes(48).toString('base64'); 
                Passport.create({
                    protocol    : 'local'
                  , password    : password
                  , user        : newUser.id
                  , accessToken : token
                  }, function (err, passport) {
                    if (err) {
                      if (err.code === 'E_VALIDATION') {
                        //req.flash('error', 'Error.Passport.Password.Invalid');
                        //return user.destroy(function (destroyErr) {
                        //  next(destroyErr || err);
                        //});
                        newUser.destroy();
                        return res.genericErrorResponse(411,"Passport password is invalid");
                      }         
                      
                    }
              
                    if (newUser.dietary==null)
                      newUser.dietary=""
                    if (newUser.rank==null)
                      newUser.rank=""
              
                    // Send confirmation email
      							sails.hooks.email.send(
      								"signupConfirmation",
      							    {
      							      recipientName: newUser.name,
      							      senderName: "Events Management",
        								  username: newUser.username,
        								  email: newUser.email,
        								  lodge: newUser.lodge,
        								  lodgeNo: newUser.lodgeNo,
        								  rank: newUser.rank,
        								  dietary: newUser.dietary,
        								  //domain:	sails.config.events.domain,
                          domain:	sails.getBaseUrl(),
        							    },
        							    {
        							      to: newUser.email,
        							      subject: "Welcome to Events Management"
        							    },
        							    function(err) {if (err) console.log(err);}
      							   )     
                      
                      // Success
                      // Mark the session as authenticated to work with default Sails sessionAuth.js policy
                      req.login(newUser, function (err) {
                        if (err) {
                          return res.genericErrorResponse(412,"Failed to login after registration");
                        }
                        // Mark the session as authenticated to work with default Sails sessionAuth.js policy
                        req.session.authenticated = true;                        
                      });
        							return res.json({
        								id:	newUser.id
        							})
                  });
                 
            })

      }   
  })
  
  

};

/**
 * Assign local Passport to user
 *
 * This function can be used to assign a local Passport to a user who doens't
 * have one already. This would be the case if the user registered using a
 * third-party service and therefore never set a password.
 *
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */
exports.connect = function (req, res, next) {
  var user     = req.user
    , password = req.param('password');

  Passport.findOne({
    protocol : 'local'
  , user     : user.id
  }, function (err, passport) {
    if (err) {
      return next(err);
    }

    if (!passport) {
      Passport.create({
        protocol : 'local'
      , password : password
      , user     : user.id
      }, function (err, passport) {
        next(err, user);
      });
    }
    else {
      next(null, user);
    }
  });
};

/**
 * Validate a login request
 *
 * Looks up a user using the supplied identifier (email or username) and then
 * attempts to find a local Passport associated with the user. If a Passport is
 * found, its password is checked against the password supplied in the form.
 *
 * @param {Object}   req
 * @param {string}   identifier
 * @param {string}   password
 * @param {Function} next
 */
exports.login = function (req, identifier, password, next) {
  var isEmail = validator.isEmail(identifier)
    , query   = {};

  if (isEmail) {
    query.email = identifier;
  }
  else {
    query.username = identifier;
  }

  
  User.findOne(query, function (err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {
      if (isEmail) {
        req.flash('error', 'Error.Passport.Email.NotFound');   
      } else {
        req.flash('error', 'Error.Passport.Username.NotFound');
      }

      return next(null, false);
    }

    Passport.findOne({
      protocol : 'local'
    , user     : user.id
    }, function (err, passport) {
      if (passport) {
        passport.validatePassword(password, function (err, res) {
          if (err) {
            return next(err);
          }

          if (!res) {
            req.flash('error', 'Error.Passport.Password.Wrong');
            return next(null, false);
          } else {
            
            var delta={};
            delta.lastLoggedIn=Date.now();
            
            User.update(user.id,delta).exec(
              function(){
                return next(null, user);    
              }
            )      
            
          }
        });
      }
      else {
        req.flash('error', 'Error.Passport.Password.NotSet');
        return next(null, false);
      }
    });
  });
};
