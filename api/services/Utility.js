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
var util        = require('util');
var async       = require("async");
var heapdump    = require("heapdump");
var path        = require("path");
var fs          = require('fs');
 

module.exports = { 

    /**
     * @name         buildIndexes
     * @memberOf     Utility
     * @description  Build missing indexes
     * @param  {String}   db  Database (or environment) name
     * @param  {Function} callback
     */
    buildIndexes: function(db,cb){
        var self=this;

        if (sails.config.models.indexes) {
            async.forEachOf(sails.config.models.indexes,function(indexInfo,index,next){
                // Only deal with indexes for the db we are interested in
                var connections=sails.models[indexInfo.table].connections;
                _.forEach(connections,function(conn){
                    if (conn.config.database==db) {
                        // Drop the index and ignore any errors (it might not exist)
                        var cmd="DROP INDEX "+index+" ON "+indexInfo.table+";";
                        sails.log.debug("Running "+cmd);
                        sails.models[indexInfo.table].query(cmd,function(err,res){
                            if (err) {
                                // Probably means it doesn't exist yet   
                            }                                
                            // Build the index
                            cmd="CREATE INDEX "+index+" ON "+indexInfo.table+" (";
                            indexInfo.columns.forEach(function(col,c){
                                if (c>0)
                                    cmd+=","
                                cmd+='`'+col+'`';
                            })
                            cmd+=");";
                            sails.log.debug("Running "+cmd); 
                            sails.models[indexInfo.table].query(cmd,function(err,res){
                                if (err) {
                                    sails.log.error(err);   
                                    next(err)
                                }
                                else {
                                    next();
                                }     
                            });   
                        })
                    }
                })
                
            },
            function(err){
                // Here when all done
                cb();                 
            })
        }  
        
    },   
    
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


  diagnosticEmail: function(err,subject,cb){
            
        if (sails.config.events.developer) {
            if (!cb)
                cb=function(){}
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
                cb
            )	
        }         
    },

  jsonSort: function(field, reverse, primer){
   
   var s=field.split(".");
   var o=s[0];
   var f
   if (s.length>1)
    f=s[1];  
    
   var key = primer ? 
       function(x) {return primer(f?x[o][f]:x[o])} : 
       function(x) {return f?x[o][f]:x[o]};

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
  },
  
    /**
     * @name            service.Utility.clearDir
     * @method
     * @description     Clear out the contents of a directory
     * @param {String}  dirPath Directory path
     * @param {Boolean} [RemoveSelf=false] Remove the target directory as well as its contents
     */
    clearDir: function(dirPath,removeSelf) {
        try { 
             var files = fs.readdirSync(dirPath); 
        }
        catch(err) { 
            sails.log.error(err)
            return; 
        }
        if (files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var filePath = path.join(dirPath,files[i]);
                if (fs.statSync(filePath).isFile()) {
                     fs.unlinkSync(filePath);
                }
                else {
                    this.clearDir(filePath,true);
                }                    
            }
        }
        if (removeSelf)  {
            fs.rmdirSync(dirPath);    
        }                 
    }, 
  
    /**
     * @name            service.Utility.memoryLeakCheck
     * @method
     * @description     Periodically produce a heapdump for memory leak analysis
     *  
     */
    memoryLeakCheck: function(){
        if (sails.config.heapdumpInterval) {
            // Clear out heapdumps first
            var xpath=path.join(sails.config.appPath,"heapdump");
            this.clearDir(xpath);
            var hd=path.join(xpath,"0.baseline.heapsnapshot");        
            heapdump.writeSnapshot(hd,function(err, filename) {
                sails.log.debug('Dump written to', filename);
            });
            setInterval(function(){
                var hd=path.join(xpath,Date.now().toString()+".heapsnapshot");        
                heapdump.writeSnapshot(hd,function(err, filename) {
                    sails.log.debug('Dump written to', filename);
                });
            },sails.config.heapdumpInterval)  
        }
    },
  
};