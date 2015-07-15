/**
 *
 * Usage:
 * res.registrationError();
 */

module.exports = function registrationError(errorCode, errorMsg) {

  // Get access to `req`, `res`, & `sails`
  var req = this.req;
  var res = this.res;
  var sails = req._sails;

  return res.send(errorCode, errorMsg)

};
