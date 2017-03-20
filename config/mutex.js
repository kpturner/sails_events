/**
 * mutex configuration - used for mutex locking
 * (sails.config.mutex)
 * 
 */

module.exports.mutex = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || '6379',
    db: process.env.REDIS_DB || 0,
    pass: process.env.REDIS_PASS || '', 
    prefix: "rns:mutex:", 
};