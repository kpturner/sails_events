/**
 * PageController
 *
 * @description :: Server-side logic for managing pages
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	validateRequest: function (req, res) {
  
    
    // If not logged in, show the public view.
    if (!req.session.me) {
      //console.log("return res.view('homepage');")     
      return res.view('homepage');
    }
    
    

    // Otherwise, look up the logged-in user and show the logged-in view,
    // bootstrapping basic user data in the HTML sent from the server
    User.findOne(req.session.me, function (err, user){
      if (err) {
        //console.log("return res.negotiate(err);")
        return res.negotiate(err);
      }

      if (!user) {
        sails.log.verbose('Session refers to a user who no longer exists- did you delete a user, then try to refresh the page with an open tab logged-in as that user?');
        //console.log('Session refers to a user who no longer exists- did you delete a user, then try to refresh the page with an open tab logged-in as that user?');
        return res.view('homepage');
      }

      //console.log("return res.view('dashboard');")
      return res.view('dashboard', {
        me: {
          id: user.id,
          userName: user.userName,
          name: user.name,
          email: user.email,
          lodge: user.lodge,
          lodgeNo: user.lodgeNo,
          rank: user.rank,
          dietary: user.dietary,
          isAdmin: user.isAdmin,
          gravatarUrl: user.gravatarUrl
        }
      });

    });
  },
};

