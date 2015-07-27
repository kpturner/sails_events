/**
 * PageController
 * 
 *
 * @description :: Server-side logic for managing pages
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	validateRequest: function (req, res) {
  
    //console.log(req.user);
    //console.log(res.locals.user);
    
    // If not logged in, show the public view.
    if (!req.session.authenticated) {
      return res.redirect("/homepage");
    }
    
    // Otherwise, look up the logged-in user and show the logged-in view,
    // bootstrapping basic user data in the HTML sent from the server
    User.findOne(res.locals.user.id, function (err, user){
      if (err) {
        //console.log("return res.negotiate(err);")
        return res.negotiate(err);
      }

      if (!user) {
        sails.log.verbose('Session refers to a user who no longer exists- did you delete a user, then try to refresh the page with an open tab logged-in as that user?');
        //console.log('Session refers to a user who no longer exists- did you delete a user, then try to refresh the page with an open tab logged-in as that user?');
        return res.view('homepage');
      }

      // Edit the profile if essentials are missing
      if ( (!user.name || user.name.length==0)
  			|| (!user.lodge || user.lodge.length==0)
  			|| (!user.lodgeNo || user.lodgeNo.length==0)
  			|| (!user.email || user.email.length==0)
        || (!user.firstName || user.firstName.length==0)
        || (!user.surname || user.surname.length==0)
  			|| ((user.authProvider=="local")
  					&& ( !user.username || user.username.length==0 )
  				)
  		) {
  			 return res.view('profile',{model:'profile'}); 
  		}
      
      //console.log("return res.view('dashboard');")
      return res.view('dashboard');

    });
  },
};

