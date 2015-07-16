/**
 *
 * Usage:
 * res.genericErrorResponse();
 */

module.exports = function genericErrorResponse(errorCode, errorMsg) {

  // Get access to `req`, `res`, & `sails`
  var req = this.req;
  var res = this.res;
  var sails = req._sails;

  return res.send(errorCode, errorMsg)

};
