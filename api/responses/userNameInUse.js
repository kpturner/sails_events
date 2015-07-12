/**
 *
 * Usage:
 * res.userNameInUse();
 */

module.exports = function userNameInUse() {

  // Get access to `req`, `res`, & `sails`
  var req = this.req;
  var res = this.res;
  var sails = req._sails;

  return res.send(410, 'User name is already taken by another user')

};

