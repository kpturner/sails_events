/**
 *
 * Usage:
 * res.editProfile();
 */

module.exports = function editProfile(user) {

  // Get access to `req` and `res`
  // (since the arguments are up to us)
  var req = this.req;
  var res = this.res;

  // All done- either send back an empty response with just the status code
  // (e.g. for AJAX requests)
  if (req.wantsJSON) {
    return res.send(200);
  }
  // Edit profile
  return res.view('profile', {
        me: user
  });
   
};

