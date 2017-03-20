/***** BEGIN LICENCE BLOCK ***************************/
/* The initial developer of the code is "CoralTree   */
/* Systems Ltd: http://www.coraltreesystems.com      */
/*                                                   */
/* Portions created by "CoralTree Systems Ltd" are   */
/* Copyright (c) 2005-2016 CoralTree Systems Ltd.    */
/* All Rights Reserved.                              */
/***** END LICENCE BLOCK *****************************/

/**      
 *   @class         service.Mutex
 *   @description   Renaissance Mutex Services  
 *                  {@link https://www.npmjs.com/package/mutex}       
 *   @author        Kevin Turner                                            
 *   @date          May 2016                                                         
 */

/********************************************************************/
/*                                                                                    
/*  Modification log                                                                  
/*  ================                                                                  
/*                                                                                    
/*  Inits  Date     Modification                                                       
/*  =====  ====     ============      
/********************************************************************/

var Strategy=require("mutex");
var uuid = require('uuid'); 
var libredis    = require("redis");
var mutex, redisClient;

module.exports = {

    /**
     * @name         service.Mutex.initialise
     * @method
     * @description  Initialise config. Moves config file data to persisted DB if in development mode
     * @param   {Object}    [strategy=redis] Optional. See {@link https://www.npmjs.com/package/mutex}
     * @param   {Function}  callback
     */
    initialise: function (strategy,cb) {
        var self = this;
       
        if (!self.mutex) { 
            
            // Create a mutex strategy
            if (!strategy) {
                strategy={
                    name:               'redis',
                    connectionString:   'redis://'+
                                    (sails.config.mutex.pass?sails.config.mutex.pass+"@":"")+
                                    sails.config.mutex.host+
                                    ":"+
                                    sails.config.mutex.port+
                                    (sails.config.mutex.db?"/"+sails.config.mutex.db:""), 
                    
                }
            }                   

            self.mutex=Strategy({
                id: uuid.v4(),
                strategy: strategy
            });
        }
        
        if (cb) cb();
    
    },   

    /**
     * @name         service.Mutex.lock
     * @method
     * @description  Attempt to obtain a mutex lock
     * @param   {String}    lockName Name of the lock
     * @param   {Object}    [options] Options. See {@link https://www.npmjs.com/package/mutex}
     * Typically we will provide "duration" and "maxWait" in milliseconds                      
     * @param   {Function}  callback
     */
    lock: function (lockName,opts,cb) {
        
        var self = this;
        
        // Set up defaults
        var lOpts={
            duration:   30000,
            maxWait:    15000,
        }
        
        if (opts) {
            lOpts=_.extend(lOpts,opts)
        }

        /** DOESN'T WORK ON CENTOS SERVER YET! 
        sails.log.verbose("Trying to lock "+lockName);
        self.mutex.lock(sails.config.mutex.prefix+lockName,lOpts)
            .then(lock => {
                sails.log.verbose("Lock obtained for "+lockName);
                cb(null,lock);
            })
            .catch(err => {
                // Could not get the lock!
                //sails.log.error(err);
                cb(err,null);
            })
        */

        // Use home-made noddy version for now
        lOpts.key=sails.config.mutex.prefix+lockName;
        lOpts.waited=0;
        lOpts.interval=100;
        lOpts.cb=cb;

        if (!redisClient) {
            var opts={
                 port:      sails.config.mutex.port,
                 host:      sails.config.mutex.host,            
            }            
            if (sails.config.mutex.db) {
                 opts.db=sails.config.mutex.db;
            }
            // Create a client
            redisClient=libredis.createClient(opts); 
             
        }                

        // Loop until the key does not exist or until we time out
        self.wait=_.bind(function(){
            var me=this;
            redisClient.exists(me.key,function(err,reply){
                if (reply==1) {
                    // It exists
                    if (me.waited>=me.maxWait) {
                        // Timed out
                        var err=new Error("Timed out trying to obtain mutex lock for "+me.key)
                        if (me.cb) {
                            me.cb(err,null);
                        }
                    }
                    else {
                        me.waited+=me.interval;
                        setTimeout(self.wait,100)
                    }               
                }
                else {
                    // OK, create the lock
                    redisClient.set(me.key,"LOCKED",function(err,reply){
                        if (err) {
                            me.cb(err,null);
                        }
                        else {
                            redisClient.expire(me.key,me.duration/1000)
                            me.cb(null,{
                                key: me.key,
                                status: "LOCKED"
                            })
                        }
                    }) 
                }
            })
        },lOpts);

        // Kick off
        // Authenticate if need be before calling function        
        if (sails.config.mutex.pass && !redisClient._authenticated) {
            redisClient.auth(sails.config.mutex.pass, function(){
                redisClient._authenticated=true;
                self.wait();
            });
        }
        else {
            self.wait();
        }        

    },
     
    /**
     * @name         service.Mutex.unlock
     * @method
     * @description  Release a mutex lock
     * @param   {Object}    lock Lock obtained by Mutex.lock                 
     * @param   {Function}  callback
     */
    unlock: function (lock,cb) {
        
        var self = this;
         /** DOESN'T WORK ON CENTOS SERVER YET! 
        if (lock && self.mutex) {
            self.mutex.unlock(lock,cb)
        }   
        */ 
         
        // Use home-made noddy version for now
        redisClient.exists(lock.key,function(err,reply){
            if (reply==1) {
                redisClient.del(lock.key,function(err,reply){
                    if (err) {
                        cb(err)
                    }
                    else {
                        cb();
                    }
                })
            }
            else {
                 var err=new Error("No lock exists for "+lock.key);
                 cb(err);
            }
        })

    }, 
     
};