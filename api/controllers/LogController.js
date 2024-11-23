/**
 * LogController
 *
 * @description :: Server-side logic for managing masonic orders for a user
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  /**
   * Download log
   */
  download: function (req, res) {
    var fileName = 'events-service.log';

    require('fs').readFile(require('path').join('logs', fileName), function (err, source) {
      if (err) {
        sails.log.error(err);
        Utility.sendCsv(req, res, [err]);
      } else {
        try {
          data = [];
          _.forEach(source.toString().split('\n'), function (l) {
            if (l) {
              try {
                data.push(JSON.parse(l));
              } catch (e) {
                // Meh!
              }
            }
          });
          Utility.sendCsv(req, res, data);
        } catch (e) {
          sails.log.error(e);
          Utility.sendCsv(req, res, [e]);
        }
      }
    });
  },

  /**
   * Process log
   */
  process: function (req, res) {
    var fileName = 'events-service.log';

    var action = req.param('action');

    switch (action) {
      case 'delete':
        require('fs').writeFile(require('path').join('logs', fileName), '', function (err) {
          if (err) {
            sails.log.error(err);
          }
        });
        break;
    }

    return res.ok();
  }
};
