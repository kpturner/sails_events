/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
			 
	/**
	* Check the provided email address and password, and if they
	* match a real user in the database, sign in.
	*/
	login: function (req, res) {
	
		// Try to look up user using the provided email address
		User.findOne({
		  email: req.param('email')
		}, function foundUser(err, user) {
			
		  if (err) return res.negotiate(err);
		  if (!user) return res.notFound();
		
		  // Compare password attempt from the form params to the encrypted password
		  // from the database (`user.password`)
		  require('machinepack-passwords').checkPassword({
		    passwordAttempt: req.param('password'),
		    encryptedPassword: user.encryptedPassword
		  }).exec({
		
		    error: function (err){
		      return res.negotiate(err);
		    },
		
		    // If the password from the form params doesn't checkout w/ the encrypted
		    // password from the database...
		    incorrect: function (){
		      return res.notFound();
		    },
		
		    success: function (){
		
		      // Store user id in the user session
		      req.session.me = user.id;
			  req.session.authenticated=true;
		
		      // All done- let the client know that everything worked.
		      return res.ok();
		    }
		  });
		});
	
	}, 
	 
	/**
	* Signup for a user account
	*/
	signup: function(req, res) {
		
		var Passwords = require('machinepack-passwords');
		 
		// Encrypt a string using the BCrypt algorithm.
		Passwords.encryptPassword({
			password: req.param('password'),
			
		}).exec({
			// An unexpected error occurred.
			error: function (err){
			 	return res.negotiate(err)
			},
			// OK.
			success: function (encryptedPassword){
				
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
						// Create a user with the params sent from the sign-up form --> signup.ejs
						User.create({
							name:  				req.param('name'),
							lodge:				req.param('lodge'),
							lodgeno:			req.param('lodgeno'),
							rank:				req.param('rank'),
							dietary:			req.param('dietary'),
							email:				req.param('email'),
							encryptedPassword:	encryptedPassword,
							lastLoggedIn:		new Date(),
							gravatarUrl:		gravatarUrl
						},function userCreated(err, newUser){
							if (err) {
																
				                // If this is a uniqueness error about the email attribute,
				                // send back an easily parseable status code.
				                if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0]
				                  && err.invalidAttributes.email[0].rule === 'unique') {
				                  return res.emailAddressInUse();
				                }
								// Otherwise, send back something reasonable as our error response.
               					 return res.negotiate(err);
							}
							 
							// Log the user in
							req.session.me=newUser.id; 
							 
							// Success
							return res.json({
								id:	newUser.id
							})
						})							
					}
				});		
			 },
		});	
		
	},
	 
	/**
	* Log out
	* (wipes `me` from the session)
	*/
	logout: function (req, res) {
	
		// Look up the user record from the database which is
		// referenced by the id in the user session (req.session.me)
		User.findOne(req.session.me, function foundUser(err, user) {
		  //if (err) return res.negotiate(err);
		  if (err) {
			sails.log.verbose('Error occurred trying to retrieve user.');
		    return res.backToHomePage();
		  }	
		
		  // If session refers to a user who no longer exists, still allow logout.
		  if (!user) {
		    sails.log.verbose('Session refers to a user who no longer exists.');
		    return res.backToHomePage();
		  }
		
		  // Wipe out the session (log out)
		  req.session.me = null;
		  req.session.authenticated=false;
		  
		  // Either send a 200 OK or redirect to the home page
		  return res.backToHomePage();
		
		});
	}, 
	
	/**
	* Get profile
	* 
	*/
	getProfile: function (req, res) {
	
		// Look up the user record from the database which is
		// referenced by the id in the user session (req.session.me)
		User.findOne(req.session.me, function foundUser(err, user) {
		  //if (err) return res.negotiate(err);
		  if (err) {
			sails.log.verbose('Error occurred trying to retrieve user.');
		    return res.backToHomePage();
		  }	
		
		  // If session refers to a user who no longer exists, still allow logout.
		  if (!user) {
		    sails.log.verbose('Session refers to a user who no longer exists.');
		    return res.backToHomePage();
		  }
		
		 return res.json(user);
		
		});
	}, 
	
	/**
	* Update profile
	*/
	updateProfile: function (req, res) {
	
		// All done- let the client know that everything worked.
		return res.ok();
	} 
};

