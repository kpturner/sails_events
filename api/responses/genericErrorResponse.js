/**
 *
 * Usage:
 * res.genericErrorResponse();
 */

module.exports = function genericErrorResponse(errorCode, errorMsg, options) {

  // Get access to `req`, `res`, & `sails`
  var req = this.req;
  var res = this.res;
  var sails = req._sails;
   
  
  sails.log.silly('res.genericErrorResponse() :: Sending '+errorCode+': '+errorMsg+' response');

  // Set status code
  res.status(errorCode);

  
  // If second argument is a string, we take that to mean it refers to a view.
  // If it was omitted, use an empty object (`{}`)
  options = (typeof options === 'string') ? { view: options } : options || {};

  // If a view was provided in options, serve it.
  // Otherwise try to guess an appropriate view, or if that doesn't
  // work, just send JSON.
  if (options.view) {
    return res.view(options.view, { data: errorMsg });
  }

  return res.send(errorCode, errorMsg) 

};
