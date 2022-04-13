/**
 * PaymentController
 *
 * @description :: Server-side logic for managing online payments
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const stripe = require("stripe");

module.exports = {

  /**
   * Get initialised stripe object
   */
  getStripe: async (eventArg) => {

    const getStripeObject = (event) => {
      sails.log.debug(`Looking for online payment details for ${event.onlinePaymentPlatform} config ${event.onlinePaymentConfig}`);
      const paymentConfig = sails.config.events.onlinePaymentPlatforms[event.onlinePaymentPlatform]
        .find(config => config.code === event.onlinePaymentConfig);
      if (!paymentConfig) {
        throw new Error(`Unable to find payment config for ${event.onlinePaymentConfig}`);
      }
      // sails.log.debug(`Found online payment config ${JSON.stringify(paymentConfig)}`);
      // sails.log.debug(`Getting online payment object with secret key ${paymentConfig.secretKey}`);
      return stripe(paymentConfig.secretKey);
    }

    return new Promise((resolve, reject) => {
      if (eventArg.id) {
        // Already a populated event object
        return resolve(getStripeObject(eventArg));
      } else {
        Event.findOne(eventArg).exec(function (err, event) {
          if (err) {
            return reject(err);
          }
          return resolve(getStripeObject(event));
        });
      }
    });
  },

  getNewCheckoutSession: async (bookingId) => {

    return new Promise((resolve, reject) => {
      try {
        Booking.findOne(bookingId)
          .populate('user') // Sorting a "populate" by more than one field doesn't seem to work. You get no results at all.
          .populate("event")
          .exec(async (err, booking) => {
            if (err) {
              return reject(err);
            }
            let stripe;
            try {
              sails.log.debug(`Getting Stripe object for event ${booking.event.id}`);
              stripe = await sails.controllers.payment.getStripe(booking.event);
            } catch (err) {
              sails.log.error(`Error occurred getting Stripe object for event ${booking.event.id}`);
              sails.log.error(err);
              return reject(err);
            }
            sails.log.debug('Got stripe object successfully');
            const domainURL = sails.config.proxyHost;

            // Create new Checkout Session for the order
            // Other optional params include:
            // [billing_address_collection] - to display billing address details on the page
            // [customer] - if you have an existing Stripe Customer ID
            // [payment_intent_data] - lets capture the payment later
            // [customer_email] - lets you prefill the email input in the form
            // For full details see https://stripe.com/docs/api/checkout/sessions/create
            try {
              sails.log.debug(`Getting Stripe session for booking ref ${booking.ref}`);
              session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                locale: 'en',
                line_items: [
                  {
                    name: booking.event.name,
                    description: booking.event.blurb || ".",
                    quantity: booking.places,
                    currency: 'gbp',
                    amount: booking.event.price * 100,
                  }
                ],
                customer_email: booking.user.email,
                client_reference_id: booking.ref,
                // ?session_id={CHECKOUT_SESSION_ID} means the redirect will have the session ID set as a query param
                success_url: `${domainURL}paymentsuccess?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${domainURL}paymentcancelled?session_id={CHECKOUT_SESSION_ID}`
              });
            } catch (err) {
              sails.log.error(`Error occurred getting Stripe session for booking ref ${booking.ref}`);
              sails.log.error(err);
              return reject(err);
            }
            sails.log.debug(`Successfully got Stripe session for booking ref ${booking.ref}`);
            return resolve(session.id);
          });
      } catch (err) {
        return reject(err);
      }

    });

  },

  /**
   * Get payment checkout session
   */
  getCheckoutSession: async (sessionId, eventId) => {
    try {
      sails.log.debug(`Getting Stripe for event id ${eventId}`);
      const stripe = await sails.controllers.payment.getStripe(eventId);
      sails.log.debug(`Getting checkout session details for session id ${sessionId}`);
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
      sails.log.debug(`Got checkout session ${checkoutSession}`);
      return checkoutSession;
    } catch (err) {
      sails.log.error(err);
      return null;
    }

  },

  /**
   * Create checkout session
   */
  createCheckoutSession: async (req, res) => {

    try {
      res.send({
        sessionId: await sails.controllers.payment.getNewCheckoutSession(req.body.bookingId)
      });
    } catch (err) {
      return res.negotiate(err);
    }

  },

  /**
   * Online payment success
   */
  paymentSuccess: async (req, res) => {
    sails.log.debug(`Successful payment ${req.query.session_id}`);
    Booking.find({ paymentSessionId: req.query.session_id })
      .populate('event')
      .populate('user')
      .exec(async (err, bookings) => {
        if (err || !bookings || bookings.length === 0) {
          sails.log.error(`Online payment - failed to retrieve booking for ${req.query.session_id}`);
          sails.log.error(err);
          return res.negotiate(err);
        } else {
          const booking = bookings[0];
          Event.findOne(booking.event.id)
            .populate('organiser')
            .populate('organiser2')
            .exec(async (err, event) => {
              if (err) {
                sails.log.error(`Online payment - failed to retrieve event for booking ${booking.event.id}`);
                sails.log.error(err);
                return res.negotiate(err);
              }
              else {
                const session = await sails.controllers.payment.getCheckoutSession(req.query.session_id, booking.event.id);
                if (session) {
                  sails.log.debug(`Successfully fetched checkout session for ${req.query.session_id} (booking: ${booking.id} event: ${booking.event.id})`);
                  sails.log.debug(`Online payment checkout session: ${session}`);
                } else {
                  sails.log.error(`Failed to fetch session for ${req.query.session_id} (booking: ${booking.id} event: ${booking.event.id})`);
                }
                if (session && booking.paymentReference !== session.payment_intent) {
                  sails.log.debug(`Online payment - flagging booking as paid etc`);
                  // Update the booking
                  const amountPaid = session.display_items[0].amount / 100;
                  Booking.update(booking.id, {
                    paymentReference: session.payment_intent,
                    paid: true,
                    mop: 'Online',
                    amountPaid: amountPaid
                  }).exec((err) => {
                    if (err) {
                      sails.log.error(`Online payment - to find booking to update for id ${booking.id}`);
                      sails.log.error(err);
                      return res.negotiate(err);
                    }
                    sails.log.debug(`Successfully updated payment details on booking ${booking.id}. Sending confirmation email.`)
                    Email.send(
                      "onlinePaymentSuccess",
                      {
                        recipientName: Utility.recipient(booking.user.salutation, booking.user.firstName, booking.user.surname),
                        senderName: sails.config.events.title,
                        amountPaid,
                        booking,
                        event: booking.event
                      },
                      {
                        from: booking.event.name + ' <' + sails.config.events.email + '>',
                        to: booking.user.email,
                        bcc: sails.controllers.booking.bookingBCC(booking, [event.organiser, event.organiser2, sails.config.events.developer]),
                        subject: 'Event booking payment processed'
                      },
                      function (err) {
                        Utility.emailError(err);
                      }
                    );

                  });
                }
              }
            });
        }
      });
    res.view('dashboard', {
      appUpdateRequested: false,
      mimicUserRequested: false
    });
  },

  /**
   * Online payment cancelled
   */
  paymentCancelled: async (req, res) => {
    sails.log.debug('Payment cancelled');
    const sessionId = req.query.session_id;
    Booking.find({ paymentSessionId: sessionId })
      .populate('user')
      .populate('event')
      .exec(async (err, bookings) => {
        if (err || !bookings || bookings.length === 0) {
          sails.log.error(`Unable to update booking for payment reference ${sessionId}`);
        } else {
          const booking = bookings[0];
          Booking.destroy({ id: booking.id }).exec(async (err) => {
            if (err) {
              sails.log.error(`Unable to destory booking for payment reference ${sessionId}`);
            } else {
              const session = await sails.controllers.payment.getCheckoutSession(req.query.session_id, bookings[0].event.id);
              if (session) {
                const amountPaid = session.display_items[0].amount / 100;
                Event.findOne(booking.event.id)
                  .populate('organiser')
                  .populate('organiser2')
                  .exec(async (err, event) => {
                    Email.send(
                      "onlinePaymentCancelled",
                      {
                        recipientName: Utility.recipient(booking.user.salutation, booking.user.firstName, booking.user.surname),
                        senderName: sails.config.events.title,
                        booking,
                        event: booking.event,
                        amountPaid
                      },
                      {
                        from: booking.event.name + ' <' + sails.config.events.email + '>',
                        to: booking.user.email,
                        bcc: sails.controllers.booking.bookingBCC(booking, [event.organiser, event.organiser2, sails.config.events.developer]),
                        subject: 'Event booking payment cancelled'
                      },
                      function (err) {
                        Utility.emailError(err);
                      }
                    );
                  });
              }
            }
          });
        }
      });
    res.view('dashboard', {
      appUpdateRequested: false,
      mimicUserRequested: false
    });
  }

};

