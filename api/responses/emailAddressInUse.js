/**
 *
 * Usage:
 * res.emailAddressInUse();
 */

module.exports = function emailAddressInUse() {

  // Get access to `req`, `res`, & `sails`
  var req = this.req;
  var res = this.res;
  var sails = req._sails;

  return res.send(409, 'Email address is already taken by another user')

};

