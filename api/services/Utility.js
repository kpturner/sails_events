/**
 * api/services/Utility.js
 *
 * @module        Service
 * @name          Utility
 * @memberOf      global
 * @description   Utilities for various common tiny tasks e.g. var action = Utility.getRequestAction(req);
 * @docs          http://sailsjs.org/#!documentation/services
 * @api           public
 **/

/**
 * Module dependencies
 */
  //var util = require('util'),
  //    _ = require('lodash');
  var util = require('util');

module.exports = {
  
  isAdmin: function(user) {
    var isAdmin=false;
    // Allow for users configured in locals.js to be admins even if their profile says otherwise
    if (user) {
      if (user.isAdmin) {
        isAdmin=true;
      }
      else {        
        var admins=sails.config.events.admins;
        if (admins) {
          if (Array.isArray(admins)) {
            isAdmin=(admins.indexOf(user.username)>=0 || admins.indexOf(user.email)>=0)
          }
          else {
            isAdmin=((user.username==admins || user.email==admins))
          }  
        }        
      }
    }
    return isAdmin 
  },


  diagnosticEmail: function(err,subject){
          if (sails.config.events.developer) {
             //console.log("Sending email to "+sails.config.events.developer)
            var errStr;
            if (typeof err=="string")
              errStr=err
            else
              errStr=JSON.stringify(err)
            Email.send(
              "diagnostic",
              {
                err:errStr
              },
              {
                to: sails.config.events.developer,
                subject: subject
              },
              function(){}
            )	
          }         
        },

  jsonSort: function(field, reverse, primer){
   
   var s=field.split(".");
   var o=s[0];
   var f=s[1];  
    
   var key = primer ? 
       function(x) {return primer(x[o][f])} : 
       function(x) {return x[o][f]};

   reverse = !reverse ? 1 : -1;

   return function (a, b) {
       return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
     } 
  },

  getRequestAction: function (req) {
    if (req.options.action) return req.options.action;

    var controller = req.options.controller || req.options.model;

    var baseRoute = sails.config.blueprints.prefix + controller;
    var requestRoute = req.route.method + ' ' + req.route.path;

    var Model = sails.models[controller];

    if (req.options.shortcuts && Model) {
      var shortcutRoutes = {
        '/%s/find/:id?': 'find',
        '/%s/create': 'create',
        '/%s/update/:id?': 'update',
        '/%s/destroy/:id?': 'destroy'
      };

      var shortcutAction = _.findWhere(shortcutRoutes, function(blueprint, pattern){
        var shortcutRoute = util.format(pattern, baseRoute);
        return req.route.path === shortcutRoute;
      });

      if (shortcutAction) return shortcutAction;
    }

    if (req.options.rest && Model) {
      var restRoutes = {
        'get /%s/:id?': 'find',
        'post /%s': 'create',
        'put /%s/:id?': 'update',
        'delete /%s/:id?': 'destroy'
      };

      var restAction =_.findWhere(restRoutes, function(blueprint, pattern){
        var restRoute = util.format(pattern, baseRoute);
        return requestRoute === restRoute;
      });

      if (restAction) return restAction;

      var associationActions = _.compact(_.map(req.options.associations, function(association){
        var alias = association.alias;

        var associationRoutes = {
          'get /%s/:parentid/%s/:id?': 'populate',
          'post /%s/:parentid/%s': 'add',
          'delete /%s/:parentid/%s': 'remove'
        };

        return _.findWhere(associationRoutes, function(blueprint, pattern){
          var associationRoute = util.format(pattern, baseRoute, alias);
          return requestRoute === associationRoute;
        });
      }));

      if (associationActions.length > 0) return associationActions[0];
    }
  }
};