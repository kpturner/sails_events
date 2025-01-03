/**
 * EventController
 *
 * @description :: Server-side logic for managing events
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const async = require('async');
const _ = require('lodash');
const Utility = require('../services/Utility');

module.exports = {
  /**
   * Events
   *
   * @param {Object} req
   * @param {Object} res
   */
  events: function (req, res) {
    res.view('events', {
      criteria: JSON.stringify(req.session.eventCriteria || {}),
      errors: req.flash('error')
    });
  },

  /**
   * Get open events
   * Find all events for the current user that are open and not passed closing date
   *
   * @param {Object} req
   * @param {Object} res
   */
  openEvents: function (req, res) {
    var today = new Date();
    today = new Date(today.setHours(0));
    today = new Date(today.setMinutes(0));
    today = new Date(today.setSeconds(0));
    var selectedUserId = req.param('selecteduserid'); // If this exists, omit events for which this user is already booked in

    // Get the orders that the user is a member of, then only pick
    // events that match the order. If the event order is blank
    // then that means it is open regardless of order
    if (sails.config.events.orders.length <= 1) {
      getEvents();
    } else {
      var userId = req.user.id;
      if (selectedUserId) {
        userId = selectedUserId;
      }

      // Events with no particular order defined are included
      // and events for the default order are always included
      let ordersToInclude = ['', null, sails.config.events.defaultOrder];

      // Include the users orders
      Order.find({ user: userId })
        .then(function (orders) {
          if (orders.length > 0) {
            _.forEach(orders, function (order) {
              ordersToInclude.push(order.code);
            });
          }
        })
        .catch(function (err) {
          sails.log.error(err);
        })
        .finally(function () {
          getEvents(ordersToInclude);
        });
    }

    function getEvents(ordersToInclude) {
      var where = {
        or: [{ hide: false }, { hide: null }, { hide: true, openingDate: { '<=': today } }]
      };

      if (!selectedUserId) {
        // If we should only show events that are not closed, check the date
        if (sails.config.events.hideClosedEvents) {
          where.closingDate = { '>=': today };
        }
        // Dashboard - so event must be flagged as open
        where.open = true;
      }
      where.date = { '>=': today };

      Event.find({
        where: where
      })
        .populate('organiser')
        .populate('organiser2')
        .populate('dc')
        .exec(function (err, events) {
          if (err) {
            sails.log.verbose('Error occurred trying to retrieve events.');
            return res.negotiate(err);
          }

          // If session refers to a user who no longer exists, still allow logout.
          if (!events) {
            return res.json({});
          }

          // Filter by order if required
          if (ordersToInclude) {
            events = events.filter((event) => {
              return ordersToInclude.indexOf(event.order) >= 0;
            });
          }

          function augmentEvents(events) {
            // For each event, add capacity and booking text before returning JSON
            var modifiedEvents = [];
            async.each(
              events,
              function (event, next) {
                // Get all the bookings for the event
                event.interest = 0;
                event.remaining = event.capacity;
                _.bind(function () {
                  var event = this;
                  var places = 0;
                  Booking.find({ event: event.id }).exec(function (err, bookings) {
                    if (!err) {
                      bookings.forEach(function (booking, index) {
                        places += booking.places;
                      });
                      if (event.regInterest) {
                        event.interest += places;
                      } else {
                        event.remaining -= places;
                        if (event.remaining < 0) {
                          event.remaining = 0;
                        }
                      }
                    } else {
                      next(err);
                    }
                    // Appropriate text
                    event.bookInText = event.regInterest ? 'Register interest' : 'Book in';
                    event.titleAugmentation = event.regInterest ? 'register interest' : 'book in';
                    // Put all visible dates to midday to avoid timezone offset confusion
                    event = Utility.sanitiseEventDates(event);
                    modifiedEvents.push(event);
                    next();
                  });
                }, event)();
              },
              function (err) {
                if (err) {
                  sails.log.error(err);
                } else {
                  // Sort in descending date order
                  modifiedEvents.sort(function (a, b) {
                    if (a.date > b.date) {
                      return -1;
                    } else if (a.date == b.date) {
                      return 0;
                    } else {
                      return 1;
                    }
                  });
                }
                return res.json(modifiedEvents);
              }
            );
          }

          // If we have a selectedUserId then only include events that the user is NOT booked into already
          // AND only if the current user is either an admin or the organiser of the event
          if (selectedUserId && !sails.config.events.multipleBookings) {
            var particularEvents = [];
            async.each(
              events,
              function (event, next) {
                // Is is a full admin so the event can be shown
                if (req.user.isAdmin) {
                  particularEvents.push(event);
                  next();
                } else {
                  // Not an administrator, so only show the event of the user is the
                  // event organiser (the Utility.isAdmin function will deal with that)
                  if (Utility.isAdmin(req.user, event)) {
                    // User is an organiser of this event so it can be shown IF the user is not
                    // already booked in
                    Booking.find({
                      where: {
                        event: event.id,
                        user: selectedUserId
                      },
                      limit: 1
                    }).exec(function (err, bookings) {
                      if (err || !bookings || (bookings && bookings.length == 0)) {
                        particularEvents.push(event);
                      }
                      next();
                    });
                  } else {
                    // Ignore the event
                    next();
                  }
                }
              },
              function (err) {
                // End of the list of events
                if (err) {
                  sails.log.error(err);
                }
                return augmentEvents(particularEvents);
              }
            );
          } else {
            return augmentEvents(events);
          }
        });
    }
  },

  /**
   * Get all events for editing
   *
   * @param {Object} req
   * @param {Object} res
   */
  allEvents: function (req, res) {
    var criteria = req.param('criteria');
    var filter, incclosed;

    if (criteria) {
      criteria = JSON.parse(criteria);
      filter = criteria.filter;
      incclosed = criteria.incclosed;
    }

    req.session.eventCriteria = criteria;
    // Check for a filter by order
    var orderFilter = null;
    if (filter) {
      _.forEach(sails.config.events.orders, function (order) {
        if (order.desc.toLowerCase() == filter.toLowerCase()) {
          orderFilter = order.code;
        }
      });
    }

    var where = {};
    var today = new Date();
    today = new Date(today.setHours(0));
    today = new Date(today.setMinutes(0));
    today = new Date(today.setSeconds(0));

    if (!incclosed) {
      where.open = true;
      where.closingDate = { '>=': today };
    }

    if (filter && filter.length > 0) {
      where.or = [{ name: { contains: filter } }, { venue: { contains: filter } }, { blurb: { contains: filter } }];
      if (orderFilter) {
        where.or.push({ order: orderFilter });
      }
    }

    Event.find({
      where: where,
      sort: {
        date: 'desc',
        time: 'desc'
      }
    })
      .populate('organiser')
      .populate('organiser2')
      .populate('dc')
      .exec(function (err, events) {
        if (err) {
          sails.log.verbose('Error occurred trying to retrieve events.');
          return res.negotiate(err);
        }

        // If session refers to a user who no longer exists, still allow logout.
        if (!events) {
          return res.json({});
        }

        // If the user is not an administrator then filter out events that they are not an organiser of
        var filteredEvents = [];
        _.forEach(events, function (event) {
          if (Utility.isAdmin(req.user, event)) {
            // Put all visible dates to midday to avoid timezone offset confusion
            event = Utility.sanitiseEventDates(event);
            filteredEvents.push(event);
          }
        });

        return res.json(filteredEvents);
      });
  },

  /**
   * Prepare event for copy/edit/delete
   */
  prepareEvent: function (req, res) {
    var action = req.param('action');
    var eventId = req.param('eventid');
    var mode = action.substr(0, 1).toUpperCase() + action.substr(1);
    // If we have an event id, retrieve it
    if (eventId) {
      Event.findOne(eventId).exec(function (err, event) {
        if (err) {
          return res.negotiate(err);
        }
        // Send the details
        return res.view('eventdetails', {
          mode: mode,
          event: event,
          onlinePaymentPlatforms: Utility.getOnlinePaymentPlatforms()
        });
      });
    } else {
      var organiser = null;
      if (!Utility.isAdmin(req.user)) {
        // This user is not an admin so make sure
        // they are the initial organisers of the event
        // so they can see it after creation
        organiser = req.user.id;
      }
      return res.view('eventdetails', {
        mode: mode,
        event: {
          latePaymentChecking: true,
          organiser: organiser
        },
        onlinePaymentPlatforms: Utility.getOnlinePaymentPlatforms()
      });
    }
  },

  /**
   * Update event (create/copy/edit/delete)
   */
  updateEvent: function (req, res) {
    var action = req.param('action');
    var event = req.param('data');
    var graceChangedTo = req.param('gracechangedto');
    var eventId = event.id;

    // Sort out the event time
    if (event.time.length > 8) {
      try {
        event.time = new Date(event.time).toTimeString().split(' ')[0];
      } catch (e) {
        // Mmmm, whats going on?   Let the database throw the error
      }
    }

    if (event.free) {
      event.price = 0;
    }

    // Decide what to do based on the action
    if (action == 'edit') {
      Event.update(eventId, event).exec(function (err, events) {
        if (err) {
          // If this is a uniqueness error about the code attribute,
          // send back an easily parseable status code.
          if (
            err.invalidAttributes &&
            err.invalidAttributes.code &&
            err.invalidAttributes.code[0] &&
            err.invalidAttributes.code[0].rule === 'unique'
          ) {
            return res.genericErrorResponse(411, 'Event code (for payment) is already in use');
          }
          // Else unknown error
          return res.negotiate(err);
        }
        var event = events[0];
        if (graceChangedTo) {
          User.findOne(event.organiser).exec(function (err, organiser) {
            event.organiser = organiser;
            // If the grace changed then warn the people booked in
            var diff = event.grace - parseInt(graceChangedTo);
            if (diff) {
              // Get all the bookings that are unpaid
              Booking.find({
                where: {
                  event: event.id,
                  or: [{ paid: false }, { paid: null }]
                }
              })
                .populate('user')
                .then(function (bookings) {
                  // Prep some text for the email
                  var wh;
                  if (diff < 0) {
                    wh = 'decreased by ' + diff * -1 + ' day(s)';
                  } else {
                    wh = 'increased by ' + diff + ' day(s)';
                  }
                  // Send the email
                  _.forEach(bookings, function (booking) {
                    var dl = new Date(booking.bookingDate);
                    dl.setDate(dl.getDate() + event.grace);
                    dl = dl.toString();
                    var deadline = dl.substr(0, dl.indexOf(':') - 2);
                    var to = booking.user.email;
                    var cc = [event.organiser.email || '', event.organiser2 ? event.organiser2.email || '' : ''];
                    var formattedDate = event.date.toString();
                    formattedDate = formattedDate.substr(0, formattedDate.indexOf('00:00:00'));
                    // Send email reminder
                    Email.send(
                      'gracePeriodChanged',
                      {
                        unitType: sails.config.events.unitType,
                        unitDesc: sails.config.events.unitDesc,
                        recipientName: Utility.recipient(
                          booking.user.salutation,
                          booking.user.firstName,
                          booking.user.surname
                        ),
                        senderName: sails.config.events.title,
                        eventDate: formattedDate,
                        event: event,
                        deadline: deadline,
                        details: booking,
                        wh: wh
                      },
                      {
                        //to: booking.user.email,
                        to: to,
                        cc: cc,
                        bcc:
                          sails.config.events.emailDeveloperOnBooking &&
                          sails.config.events.developer &&
                          sails.config.events.developer != event.organiser.email
                            ? sails.config.events.developer
                            : '',
                        subject: event.name + ' - Payment deadline changed'
                      },
                      function (err) {
                        if (err) console.log(err);
                      }
                    );
                  });
                })
                .catch(function (err) {
                  sails.log.error(err);
                })
                .finally(function () {});
            }
          });
        }
        return res.ok();
      });
    } else if (action == 'delete') {
      // Make sure there are no bookings!
      Booking.find({ event: eventId }).exec(function (err, bookings) {
        if (bookings && bookings.length > 0) {
          return res.genericErrorResponse(460, 'You cannot delete an event with bookings against it!');
        }
        // Carry on and delete it
        Event.destroy(eventId).exec(function (err) {
          if (err) {
            return res.negotiate(err);
          }
          return res.ok();
        });
      });
    } else if (action == 'copy' || action == 'create') {
      delete event.id;
      event.lastBookingRef = 0;
      Event.create(event).exec(function (err, event) {
        if (err) {
          // If this is a uniqueness error about the code attribute,
          // send back an easily parseable status code.
          if (
            err.invalidAttributes &&
            err.invalidAttributes.code &&
            err.invalidAttributes.code[0] &&
            err.invalidAttributes.code[0].rule === 'unique'
          ) {
            return res.genericErrorResponse(411, 'Event code (for payment) is already in use');
          }
          // Else unknown error
          return res.negotiate(err);
        }
        return res.ok();
      });
    }
  },

  /**
   * Verify bypass code
   */
  verifyBypassCode: function (req, res) {
    Event.findOne(req.param('id')).exec(function (err, event) {
      if (!err && event.bypassCode.toLowerCase() == req.param('bypassCode').toLowerCase()) {
        return res.ok();
      }
      return res.notFound();
    });
  }
};
