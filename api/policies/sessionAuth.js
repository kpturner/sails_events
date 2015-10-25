/**
 * sessionAuth
 *
 * @module      :: Policy
 * @description :: Simple policy to allow any authenticated user
 *                 Assumes that your login action in one of your controllers sets `req.session.authenticated = true;`
 * @docs        :: http://sailsjs.org/#!/documentation/concepts/Policies
 *
 */
module.exports = function(req, res, next) {

  // User is allowed, proceed to the next policy, 
  // or if this is the last policy, the controller
  // Bear mind that if the user is not authenticated, but the URL
  // is the homepage or just "/" (the PageController will handle this)
  // or we are being authenticated, we can also proceed
  res.locals.developer=sails.config.events.developer;
  if (req.session.authenticated || req.url=="/" || req.url=="/homepage" || req.url=="/register" || req.url.indexOf("/auth/")>=0) {
    return next();
  } 
  // User is not allowed
  // (default res.forbidden() behavior can be overridden in `config/403.js`)
  //return res.forbidden('You are not permitted to perform this action.');
  return res.redirect("/");  //Page controller can take over
    
};
