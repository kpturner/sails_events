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
var mutex;

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
        
            sails.log.debug(strategy)

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
        
        if (lock && self.mutex) {
            self.mutex.unlock(lock,cb)
        }    
        
    }, 
     
};