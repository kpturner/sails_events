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
   resetAuth: function(req, res) {
      // Mark the user as logged out for auth purposes
      req.session.authenticated = false;
      
      // Clear remember me cookie if we are going straight to the homepage, otherwise
      // the remember-me strategy will override any attempt to log back on with a 
      // passport instead of a local user.
      res.clearCookie('remember_me');
   },


  /**
   * Render the home page
   *
   * @param {Object} req
   * @param {Object} res
   */
  homepage: function (req, res) {
    var strategies = sails.config.passport
      , providers  = {};

    // Get a list of available providers for use in your templates.
    Object.keys(strategies).forEach(function (key) {
      if (key === 'local' || key === 'rememberme') {
        return;
      }

      providers[key] = {
        name: strategies[key].name,
        icon: strategies[key].icon,
        klass: strategies[key].klass,
        label: strategies[key].label,
        slug: key
      };
    });

    // Clear the user out of the session also
    req.logout();

    // Reset authentication 
    AuthController.resetAuth(req, res);    
    
    // Render the `auth/login.ext` view
    res.view('homepage',{
      providers : providers
    , errors    : req.flash('error')
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
    
    req.session.eventBookings=false;
    res.view('dashboard');
  
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
   * ports and users, both locally and from third-aprty providers.
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
    
    function tryAgain (err) {
      //console.log("I am in callback")
      // Only certain error messages are returned via req.flash('error', someError)
      // because we shouldn't expose internal authorization errors to the user.
      // We do return a generic error and the original request body.
      var flashError = req.flash('error')[0];

      if (err && !flashError ) {
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
          res.redirect('/register',{form:'signup'});
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
        
        if (user.authProvider!="local") {
          var delta={};
          delta.lastLoggedIn=new Date().toISOString().slice(0, 19).replace('T', ' ');
          User.update(user.id,delta).exec(function(){});  
          // Upon successful login, send the user to the homepage were req.user
          // will be available.
          res.redirect('/');
        }           
        else {
          // Was "Remember me" selected?
          if (req.param("rememberme")) {
            var crypto    = require('crypto');
            // Destroy existing tokens for user
            Token.destroy({user:user.id},function(){
              var token = crypto.randomBytes(64).toString('base64'); 
              Token.create({token:token, user: user.id }, function(err) {
                if (err) { return next(err); }
                res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: sails.config.passport.rememberme.maxAge }); // 7 days
                // Upon successful login, send the user to the homepage were req.user
                // will be available.
                res.redirect('/');
              });
            });            
          }
          else {
            // Upon successful login, send the user to the homepage were req.user
            // will be available.
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
  profile: function(req, res) {
    res.view('profile',{
      form: 'profile',
      salutations: sails.config.events.salutations,
      errors: req.flash('error')
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
		User.findOne(req.user.id, function foundUser(err, currentUser) {
			//if (err) return res.negotiate(err);
		  	if (err) {
				sails.log.verbose('Error occurred trying to retrieve user.');
				req.session.authenticated=false;
		    	return res.backToHomePage();
		  	}	
		
		  	// If session refers to a user who no longer exists, still allow logout.
		  	if (!currentUser) {
		    	sails.log.verbose('Session refers to a user who no longer exists.');
				  req.session.authenticated=false;
		    	return res.backToHomePage();
		  	}
		  
		  	// Build the update JSON specifying only the deltas
		  	var delta={};
        
        var profile=req.param("profile");
        for(var field in profile) {
          if (!(profile[field]==undefined) && profile[field]!=currentUser[field])
            delta[field]=profile[field];
        }
        
                 
        // Always treat the email as changed so the gravatar is updated after a social media sign-up
        delta.email=profile.email;  
				  
			var handleDelta=function(req,delta){
				if (delta.email) {					 
					var Gravatar = require('machinepack-gravatar');
					// Build the URL of a gravatar image for a particular email address.
					Gravatar.getImageUrl({
						emailAddress: delta.email,
						gravatarSize: 400,
						rating: 'g',
						useHttps: true,
					}).exec({
						error: function(err) {
							return res.negotiate(err)
						},
						success: function(gravatarUrl) {
							delta.gravatarUrl=gravatarUrl;
							return handlePassword(req,delta);
						}	
					});				 			
				}
				else {
					return handlePassword(req,delta)
				}
			}	
			
			var handlePassword=function(req,delta){
				if (req.param('password')) {
					
					// Get the existing passport
					Passport.findOne({ user: req.user.id }, function(err, passport) {
					    if (err) { return res.negotiate(err); }
					    if (!passport) { return res.negotiate(err); }
					    var validator = require('validator');
						var crypto    = require('crypto');
						var token = crypto.randomBytes(48).toString('base64'); 
						Passport.update(
							passport.id,{
								password: 		req.param("password"),
								accessToken: 	token
							}
						).exec(function(err, passport){
							if (err) {
		                      if (err.code === 'E_VALIDATION') {
		                        //req.flash('error', 'Error.Passport.Password.Invalid');
		                        //return user.destroy(function (destroyErr) {
		                        //  next(destroyErr || err);
		                        //});
		                        return res.genericErrorResponse(411,"Passport password is invalid");
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
			
			var updateUser=function(delta) {
				User.update(req.user.id,delta).exec(function afterwards(err, updatedUser){
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
						// Otherwise, send back something reasonable as our error response.
						 return res.negotiate(err);
					}
					// Success
          if (updatedUser[0].dietary==null)
            updatedUser[0].dietary=""
          if (updatedUser[0].rank==null)
            updatedUser[0].rank=""
          if (updatedUser[0].phone==null)
            updatedUser[0].phone=""
          if (!updatedUser[0].isVO)
					 updatedUser[0].isVO=false
				  if (!updatedUser[0].isAdmin)
					 updatedUser[0].isAdmin=false
				  if (!updatedUser[0].isOrganiser)
					 updatedUser[0].isOrganiser=false  
          // Send confirmation email
					sails.hooks.email.send(
						"profileChanged", {
    				      recipientName: updatedUser[0].salutation + " " + updatedUser[0].firstName,
    				      senderName: sails.config.events.title,
    			        details: updatedUser[0]
							  
						    },
						    {
						      to: updatedUser[0].email,
                  bcc: sails.config.events.developer || "",
						      subject: sails.config.events.title + " - Profile updated confirmation"
						    },
						    function(err) {if (err) console.log(err);}
					   )     
					// Logout if the password has changed
					if (req.param('password')) {
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
		
  		// Handle the delta model
  		return handleDelta(req,delta);				
			 
		});
	},
  
  
  /**
	 * Password reset email
   *
   * @param {Object} req
   * @param {Object} res
	*/
	passwordReset: function (req, res) {
	 	
    var crypto    = require('crypto');
     
   	User.findOne({email:req.param("email")}).exec(function(err, user) {
       
        var sendEmail=function(user,newPassword){
           // Send confirmation email
  					sails.hooks.email.send(
  						"passwordReset", {
      				    recipientName: user.salutation + " " + user.firstName,
                  senderName: sails.config.events.title,
  				        newPassword: newPassword,
                  domain:	(sails.config.events.domain)?sails.config.events.domain:sails.getBaseUrl(),  							   
  					   },
  						 {
                  to: user.email,
                  bcc: sails.config.events.developer || "",
  						    subject: sails.config.events.title + " - Password reset"
  						 },
  						    function(err) {if (err) console.log(err);}
  					   )             
        }
			  
        if (user) {
          
          Passport.findOne({user:user.id}).exec(function(err,passport){
            
            var newPassword;
            
            if (passport.provider) {
              newPassword="You need to log on with your "+passport.provider+" account!";
              sendEmail(user,newPassword);
            }
            else {
              // Create new password
              newPassword = crypto.randomBytes(8).toString('base64');
              //var token = crypto.randomBytes(48).toString('base64'); 
              Passport.update(passport.id,{
                password    : newPassword
              }).exec(function(err,passport){
                if (err)
                  console.log(err)
                else {
                  newPassword="Your new temporary password is: "+newPassword;
                  sendEmail(user,newPassword);   
                }                
              });              
              
            }            
           
              
          })          
          return res.ok();	 			   
        }
        else {
          return res.genericErrorResponse(412,"Email address is not registered in the database"); 		  
        }        
		});
	},
   
  	
  
    
};

module.exports = AuthController;
