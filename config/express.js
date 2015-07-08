/**
 * Module to help with device detection 
 *
 * For more information on configuration, check out:
 * https://github.com/rguerreiro/express-device
 */

module.exports.http = {
  customMiddleware: function (app) {
    var device = require('express-device');
    app.use(device.capture());
  }
};