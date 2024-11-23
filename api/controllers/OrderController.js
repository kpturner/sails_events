/**
 * OrderController
 *
 * @description :: Server-side logic for managing masonic orders for a user
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  /**
   * Other orders
   */
  otherOrders: function (req, res) {
    var userId = req.param('userid');

    Order.find({ user: userId }).exec(function (err, otherOrders) {
      if (err) {
        return res.negotiate(err);
      }

      return res.json(otherOrders);
    });
  },

  /**
   * Update other orders
   */
  updateOtherOrders: function (userId, orders, cb) {
    Order.destroy({ user: userId }).exec(function (err) {
      if (orders) {
        _.forEach(orders, function (order) {
          order.user = userId;
        });
        Order.create(orders, function (err, newOrders) {
          if (err) {
            sails.log.error(err);
          } else {
            //sails.log.debug("Other orders created")
          }
          // Callback if required
          if (cb) {
            cb(err, newOrders);
          }
        });
      } else {
        // Callback if required
        if (cb) {
          cb(err, newOrders);
        }
      }
    });
  }
};
