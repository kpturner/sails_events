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
var libredis    = require("redis");
var util        = require('util');
var async       = require("async");
var path        = require("path");
var fs          = require("fs");
var graph       = require("fbgraph"); 
var Twit        = require("twit");
var google      = require('googleapis');
var plus        = google.plus('v1'); 
var Gravatar    = require('machinepack-gravatar');
var moment      = require('moment-timezone');
var redisClient;  

module.exports = { 

    /** 
     * Return todays date at 00:00:00 (ignoring DST)
     */
    today: function(){
        var realDate=moment.tz(new Date(),sails.config.events.timezone).format();
        var splits=realDate.split("-");
        splits[2]=splits[2].split("T")[0];
        var t=new Date(parseInt(splits[0]),parseInt(splits[1])-1,splits[2],0,0,0,0);	
        return t;
    },

    /**
     * Return a database date in UTC format ignoring DST
     * The Mysql adaptor will return a date file set to 
     * 23:00:00 the previous day when DST in in use and 
     * we don't want that
     */
    UTCDBdate: function(dateIn) {
        var offset=dateIn.getTimezoneOffset()/60;
		var dateOut=Date.UTC(   dateIn.getUTCFullYear(),
                                dateIn.getUTCMonth(),
                                dateIn.getUTCDate()-offset,
                                0,
                                0,
                                0
        );
        return dateOut;
    },

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
                        var cmd="DROP INDEX `"+index+"` ON `"+indexInfo.table+"`;";
                        sails.log.debug("Running "+cmd);
                        sails.models[indexInfo.table].query(cmd,function(err,res){
                            if (err) {
                                // Probably means it doesn't exist yet   
                            }                                
                            // Build the index
                            cmd="CREATE INDEX `"+index+"` ON `"+indexInfo.table+"` (";
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
    
    /**
     * @name            areas
     * @method
     * @description     Return an array of areas
    
     * @return {Array} 
     */
    areas: function() {
        var areas=[];
        if (typeof sails.config.events.areas=="string") {
            areas.push(sails.config.events.areas)
        }
        else {
            areas=sails.config.events.areas;
        }
        return areas
    },

    isAdmin: function(user,event) {
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
        if (!isAdmin) {
            if (event) {
                var id1=(event.organiser && typeof event.organiser=="object")?event.organiser.id:event.organiser;
                var id2=(event.organiser2 && typeof event.organiser2=="object")?event.organiser2.id:event.organiser2;
                var id3=(event.dc && typeof event.dc=="object")?event.dc.id:event.dc;
                // If we have an event then the user can be admin of the event if they are its organiser
                isAdmin=(
                    (id1 && id1==user.id) ||
                    (id2 && id2==user.id) ||
                    (id3 && id3==user.id) 
                );
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
                    errStr=err.toString();
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
        function(x) {return primer(f&&x[o]?x[o][f]:x[o])} : 
        function(x) {return f&&x[o]?x[o][f]:x[o]};

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
                var heapdump    = require("heapdump");
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

        /**
         * @name            service.Utility.recipient
         * @method
         * @description     Return appropriate recipient text
         * @param {String}  Salutation
         * @param {String}  First name
         * @param {String}  Surname
         * @return {String} 
         */
        recipient: function(salutation,firstName,surname) {
            var recip;
            if (['Mr', 'Mrs', 'Ms', 'Miss'].indexOf(salutation)>=0) {
                recip=salutation + " " + surname;
            }
            else {
                recip=salutation + " " + firstName;
            }
            return recip;
        },

        /**
         * @name            service.Utility.updateAvatars
         * @method
         * @description     Update all user avatars
         
         */
        updateAvatars: function(){
            User.find({               
                //where: {
                //    or: [
                //        {authProvider:"facebook"},
                //        {authProvider:"twitter"},
                //        {authProvider:"google"},
                //    ]
                //}
            })
            .sort("surname")
            .populate("passports")
            .then(function(users){
                _.forEach(users,function(user){
                    Utility.getAvatar(user,function(err,avatar){
                        if (!err) {
                            User.update(user.id,{
                                gravatarUrl: avatar
                            }).exec(function(err,updatedUsers){
                                if (err) {
                                    sails.log.error(err.message)
                                }
                                else {
                                    sails.log.debug("Avatar updated for "+updatedUsers[0].name)
                                }                                
                            })
                        }
                    })
                })
            })
        },

        /**
         * @name            service.Utility.getAvatar
         * @method
         * @description     Return avatar for profile
         * @param {Object}  User
         * @param {Function} Callback - passed the avatar url
         */
        getAvatar: function(user,cb) {
            var avatar=user.gravatarUrl;
            var passport,e;
            if (!user.passports) {
                Passport.findOne({ user: user.id })
                    .then(function(pp) {
                        passport=pp;         
                        getIt();
                    });
            }
            else {
                if (user.passports.length>0) {
                    // There will only be one passport per user in this system
                    passport=user.passports[0];
                }
                getIt();     
            }
           
            function getIt(){
                if (passport) {               
                    try {
                        // Get the piccie
                        switch (user.authProvider) {                            
                            case "facebook":
                                avatar="";
                                if (passport.tokens) {
                                     graph.get("me/picture?height=48&width=48&access_token="+passport.tokens.accessToken,function(err,res){
                                        if (err) {
                                            e=err;
                                            sails.log.error("Cannot get avatar for Facebook user "+user.name+": "+err.message);
                                        }
                                        else {
                                            avatar=res.location;                                              
                                        } 
                                        cb(e,avatar); 
                                    }) 
                                }
                                else {
                                    sails.log.debug("Cannot find passport tokens for user "+user.name+" ("+user.id+")");
                                    cb(e,avatar); 
                                }               
                                break;
                            case "twitter":
                                avatar="";
                                if (passport.tokens) {
                                    // Create twitter interface 
                                    twitter=new Twit({
                                        consumer_key:       sails.config.passport.twitter.options.consumerKey,
                                        consumer_secret:    sails.config.passport.twitter.options.consumerSecret,
                                        access_token:       passport.tokens.token,
                                        access_token_secret:passport.tokens.tokenSecret
                                    })
                                    twitter.get("users/show",{user_id:passport.identifier},function(err,data,res){
                                        if (err) {
                                            e=err;
                                            sails.log.error("Cannot get avatar for Twitter user "+user.name+": "+err.message);                                           
                                        }
                                        else {
                                            avatar=data.profile_image_url;
                                        }
                                        cb(e,avatar); 
                                    }) 
                                }
                                else {
                                    sails.log.debug("Cannot find passport tokens for user "+user.name+" ("+user.id+")");
                                    cb(e,avatar); 
                                }                        
                                break;
                            case "google":
                                avatar="";
                                if (passport.tokens) {
                                    plus.people.get({
                                        userId: passport.identifier,
                                        auth:   sails.config.passport.google.options.apiKey      
                                    },function(err, data){
                                        if (err) {
                                            e=err;
                                            sails.log.error("Cannot get avatar for Google user "+user.name+": "+err.message);                                            
                                        }
                                        else {
                                            avatar=data.image.url;
                                        } 
                                        cb(e,avatar); 
                                    })  
                                }
                                else {
                                    sails.log.debug("Cannot find passport tokens for user "+user.name+" ("+user.id+")");
                                    cb(e,avatar);  
                                }                                                                                            
                                break;    
                            default:
                                if (user.useGravatar) {
                                    Gravatar.getImageUrl({
                                        emailAddress: user.email,
                                        gravatarSize: 48,
                                        rating: 'g',
                                        useHttps: true,
                                    }).exec({
                                        error: function(err) {
                                            sails.log.error("Cannot get gravatar for user "+user.name+": "+err.message);
                                            cb(err,avatar);
                                        },
                                        success: function(gravatar) {
                                            sails.log.debug("Gravatar for user "+user.name+" set to: "+gravatar)
                                            avatar=gravatar;
                                            cb(null,avatar);
                                        }	
                                    });	
                                }
                                else {
                                    sails.log.debug("Removing Gravatar for user "+user.name)
                                    cb(null,"");
                                }
                        }
                    }
                    catch(err) {
                        sails.log.error(err);
                        cb(err,avatar);
                    }
                }
                else {
                    sails.log.debug("Cannot find passport for user "+user.name+" ("+user.id+")")
                    cb(null,"");
                }
            }
            
        },


        /**
         * Augment user details based on event order. This basically
         * overrides rank and lodge etc and label for lodge
         */
        augmentUser: function(event,user,cb) {
            if (user) {
                user.orderLabel=Utility.orderLabel(event.order);
                if (event.order && event.order!="C") {
                    Order.find({user:user.id}).exec(function(err, orders){
                        _.forEach(orders,function(order){
                            if (event.order==order.code) {
                                user.salutation=order.salutation || "";
                                user.rank=order.rank || "";							 
                                user.lodge=order.name || "";
                                user.lodgeNo=order.number || "";							 						
                                user.centre=order.centre || "";
                                user.area=order.area || "";		
                            }
                            return false;
                        })
                        cb(user)
                    });						
                }	
                else {
                    cb(user)
                }
            }
            else {
                cb({})
            }
        },

        /**
         * Order label
         */
        orderLabel:function(order){
            // Order label
            var orderLabel;
            if (order && order!="C") {
                sails.config.events.orders.forEach(function(cfg){
                    if (order==cfg.code) {
                        orderLabel=(cfg.label)?cfg.label:"Lodge";
                        return false;
                    }
                })
                if (!orderLabel) {
                    orderLabel="Lodge";
                }
            }
            else {
                orderLabel="Lodge";
            }
            return orderLabel;
        },
  
        /**
         * Order details
         */
        orderDetails:function(order){
            // Order label
            var res={};
            if (order.code && order.code!="C") {
                sails.config.events.orders.forEach(function(cfg){
                    if (order.code==cfg.code) {
                        res.label=(cfg.label)?cfg.label:"Lodge";
                        res.desc=cfg.desc;
                        return false;
                    }
                })
                if (!res.label) {
                    res.label="Lodge";
                    res.desc="Craft";
                }
            }
            else {
                res.label="Lodge";
                res.desc="Craft";
            }
            return res;
        },

        /**
         * Email error. Handle errors that occur sending emails!
         */
        emailError: function(err){
            if (err) {
                var errStr;
                if (typeof err=="string")
                    errStr=err
                else
                    errStr=err.toString();
                sails.log.error("Emailing error: "+err);
                // Try to inform the developer
                if (sails.config.events.developer) {
                    setTimeout(function(){
                        try {
                            Email.send(
                                "diagnostic",
                                {
                                    err:errStr
                                },
                                {
                                    to: sails.config.events.developer,
                                    subject: "Email failure"
                                },
                                function(){}
                            )	
                        }
                        catch(e) {
                            // No dice!
                        }
                    },10)
                }
            };
        },

        /**
	 * Download CSV
	 * https://gist.github.com/jeffskelton3/2b9fc748ec69205694dc
	 */
	sendCsv: function(req, res, data, optionsIn) {

	  var sails = req._sails
	  ,   options = _.extend({},optionsIn)
	  ,   json2csv = require('json2csv')
	  ,   fs = require('fs')
	  ,   download_dir = path.join(".tmp","downloads")
	  ,   filename = options && options.filename ? options.filename : 'file_' + ((new Date().getTime().toString())) + '.csv'
      ,   fullpath = path.join(download_dir,filename);
	
	  	
	  sails.log.silly('res.csv() :: Sending 200 ("OK") response');
	
		
	  //PUT THE DATA THROUGH THE GAUNTLET...
	
	  if(!data){
	    throw new Error('data cannot be null');
	  }
	
	  if(!_.isArray(data)){
	    throw new Error('data must be of type array');
	  }
	
	  var columns = data.length ? _.keys(data[0]) : [];
	
	  // if we made it this far, send the file
	
	  // Set status code
	  res.status(200);
	
	  options.data=data;
	  options.fields=columns;
	
	  json2csv(options, function(err, csv) {
	
	    if (err) { throw err; }
	
	    //make the download dir if it doesnt exist
	    fs.mkdir(download_dir, 0777, function(err){
	      if(err){
	        //we dont care if the directory already exists.
	        if (err.code !== 'EEXIST'){
	          throw err;
	        }
	      }
	
	      //create the csv file and upload it to our directory
	      fs.writeFile(fullpath, csv, function(err) {
	        if (err) throw err;
	        sails.log.silly('file saved to ' + fullpath);
	        res.download(fullpath, filename, function(err){
	          if(err) {
	            throw err;
	          }
	
	          //delete the file after we are done with it.
	          fs.unlink(fullpath,function(){});
	
	        });
	      });
	
	    });
	
	
	
	  });
	  
	},

    /**
     * @name            service.Utility.deleteRedisKeys
     * @method
     * @description      Delete redis keys en-masse
     * @param {Array}    keys   An array of key search strings. It is also possible to pass a single  key as a string.
     * @param {Function} [cb]   callback
     *  
     */
    deleteRedisKeys: function(keys, cb) {
        if (!redisClient) {
             // Add function to client
             libredis.RedisClient.prototype.delWildcard = function(key, callback) {
                var redis = this            
                redis.keys(key, function(err, rows) {
                    async.each(rows, function(row, callbackDelete) {
                        sails.log.verbose("Deleting "+row)
                        redis.del(row, callbackDelete)
                    }, callback)
                });
            }
            var opts={
                 port:      sails.config.mutex.port,
                 host:      sails.config.mutex.host,            
            }            
            if (sails.config.mutex.db) {
                 opts.db=sails.config.mutex.db;
            }
            // Create a client
            redisClient=libredis.createClient(opts) 
             
        }            
         
        // Function to actually do the business
        var del=_.bind(function(){
            var self=this;
            // String or array of keys?
            if (typeof this.keys=="string") {
               redisClient.delWildcard(this.keys, this.cb)
            } 
            else {
                // Array of keys
                async.forEach(this.keys,function(key,next){
                    redisClient.delWildcard(key, next);
                },
                function(err){
                    // All done
                    if (err) {
                        sails.log.error(err);                        
                    }
                    self.cb();
                })
            }
        },{keys:keys,cb:cb})   

        // Create a test then delete it
        /*
        redisClient.set('mytest', 'myvalue',function(err,reply){
            if (err) {
                console.log(err)
            }
            console.log("Set "+reply)
            redisClient.get('mytest', function(err, reply) {
                if (err) {
                    console.log(err)
                }
                console.log("Get "+reply);
                redisClient.del('mytest', function(err, reply) {
                    if (err) {
                        console.log(err)
                    }
                    console.log("Del "+reply);        
                });    
            });
        });
        */

        // Authenticate if need be before calling function        
        if (sails.config.mutex.pass) {
            redisClient.auth(sails.config.mutex.pass, del);
        }
        else {
            del();
        }
    }, 

};