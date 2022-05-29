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
              // The amount to pay (for a new booking) will be the event price multiplied
              // by the number of places
              let name = booking.event.name;
              let quantity = booking.places;
              if (booking.amountPaid) {
                // This means they have added one or places to the original booking
                // so we need to calculate the quantity and amount for this payment
                const balance = booking.cost - booking.amountPaid;
                quantity = balance / booking.event.price;
                name = name + ' (BALANCE)'
              }
              if (quantity > 0) {
                session = await stripe.checkout.sessions.create({
                  payment_method_types: ['card'],
                  locale: 'en',
                  line_items: [
                    {
                      name,
                      description: booking.event.blurb || ".",
                      quantity,
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
              } else {
                sails.log.debug(`Not got Stripe session for booking ref ${booking.ref}. We are not processing refunds this way.`);
                return resolve(null);
              }
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
      return await stripe.checkout.sessions.retrieve(sessionId);
    } catch (err) {
      sails.log.error(err);
      return null;
    }

  },

  /**
   * Process refund
   * Accepts a booking and a refund object
   */
  processRefund: async (booking, refund) => {
    return new Promise((resolve, reject) => {
      try {
        // Now we can modify the booking to reflect the refund
        if (refund.status === 'succeeded') {
          const refundMap = booking.refundReference ? JSON.parse(booking.refundReference) : {};
          refundMap[refund.id] = refund;
          const refundReference = JSON.stringify(refundMap);
          const amountPaid = booking.amountPaid - (refund.amount / 100);
          paid = (amountPaid <= 0);
          Booking.update(booking.id, {
            refundReference,
            paid,
            amountPaid
          }).exec((err) => {
            if (err) {
              sails.log.error(`Online refund - failed to find booking to update for id ${booking.id}`);
              return reject(err);
            }
            sails.log.debug(`Successfully updated refund details on booking ${booking.id} amount ${refundAmount}. Sending confirmation email.`)
            return resolve()
          });
        } else {
          return reject(`Online refund attempt failed!: ${JSON.stringify(refund)}`);
        }
      } catch (err) {
        return reject(err);
      }
      return reject();
    });
  },

  /**
   * Issue refund
   * Returns a refund object
   * {
      "id": "re_3L4kDr2eZvKYlo2C03T947RR",
      "object": "refund",
      "amount": 100,
      "balance_transaction": null,
      "charge": "ch_3L4kDr2eZvKYlo2C0DkJtSQQ",
      "created": 1653823431,
      "currency": "usd",
      "metadata": {},
      "payment_intent": null,
      "reason": null,
      "receipt_number": null,
      "source_transfer_reversal": null,
      "status": "succeeded",
      "transfer_reversal": null
    }
   */
    issueRefund: async (booking, amount) => {
    try {
      if (booking.paymentReference) {
        const eventId = booking.event.id;
        if (!eventId) {
          throw new Error('Booking object for a refund must be fully resolved. The booking does not contain the event object');
        }
        sails.log.debug(`Getting Stripe for event id ${booking.event}`);
        const stripe = await sails.controllers.payment.getStripe(eventId);
        sails.log.debug(`Issuing refund(s) for booking ${booking.id} for £${amount}`);

        // Build a map of our payment references (intents)
        let paymentMap;
        if (typeof booking.paymentReference  === 'string') {
          paymentMap = { paymentReference: booking.paymentReference };
        } else {
          paymentMap = booking.paymentReference ? JSON.parse(booking.paymentReference) : {};
        }

        // Traverse our payment references until we exhaust the amount we need to refund
        const refundMap = {};
        const amountLeft = amount;
        const keys = Object.keys(paymentMap);
        keys.every((paymentReference) => {
          if (amountLeft <= 0) {
            return false;
          }
          if (paymentMap[paymentReference] >= amountLeft) {
            // This payment reference can fully cover the refund
            refundMap[paymentReference] = amountLeft;
            // Reduce theh payment reference accordingly
            paymentMap[paymentReference] = paymentMap[paymentReference] - amountLeft;
            amountLeft = 0;
          } else {
            // This payment reference can partially cover the refund
            refundMap[paymentReference] = paymentMap[paymentReference];
            amountLeft -= paymentMap[paymentReference];
            // Exhausted the payment so delete the pyment reference
            delete paymentMap[paymentReference];
          }
        });
        // If we have any left unrefundable we have a problem!
        if (amountLeft) {
          sails.log.error(`Cannot issue refund for booking ${booking.id}, amount: ${amount} as the booking payment references do not cover the refund amount`);
          return null;
        }

        // Traverse the refund map and issue the refunds
        const ok = true;
        for (const refundReference of Object.keys(refundMap)) {
          if (refundMap[refundReference]) {
            try {
              const refund = await stripe.refunds.create({
                payment_intent: refundReference,
                amount: refundMap[refundReference] * 100
              });
              await sails.controllers.payment.processRefund(booking, refund);
            } catch (err) {
              console.error(err);
              ok = false;
            }
          }
        }

        // Update the payment reference map on the booking
        const paymentReference = JSON.stringify(paymentMap);

        if (ok) {
          Booking.update(booking.id, {
            paymentReference: paymentReference
          }).exec((err) => {
            if (err) {
              sails.log.error(`Online refund - failed to find booking to update for id ${booking.id}`);
            }
            sails.log.debug(`Successfully updated refund details on booking ${booking.id}. Sending confirmation email.`)
            Email.send(
              "onlineRefundSuccess",
              {
                recipientName: Utility.recipient(booking.user.salutation, booking.user.firstName, booking.user.surname),
                senderName: sails.config.events.title,
                amountRefunded: (refundAmount / 100),
                booking,
                event: booking.event
              },
              {
                from: booking.event.name + ' <' + sails.config.events.email + '>',
                to: booking.user.email,
                bcc: sails.controllers.booking.bookingBCC(booking, [event.organiser, event.organiser2, sails.config.events.developer]),
                subject: 'Event booking refund processed'
              },
              function (err) {
                Utility.emailError(err);
              }
            );
          });
        } else {
          // Email refund failure
          sails.log.error(`Online refund attempt failed!: ${JSON.stringify(refund)}. Sending failure email.`)
            Email.send(
              "onlineRefundFailure",
              {
                recipientName: Utility.recipient(booking.user.salutation, booking.user.firstName, booking.user.surname),
                senderName: sails.config.events.title,
                refundObject: refund
              },
              {
                from: booking.event.name + ' <' + sails.config.events.email + '>',
                to: booking.user.email,
                bcc: sails.controllers.booking.bookingBCC(booking, [event.organiser, event.organiser2, sails.config.events.developer]),
                subject: 'Event booking refund failed!'
              },
              function (err) {
                Utility.emailError(err);
              }
            );
        }

      } else {
        sails.log.error(`Cannot issue refund for booking ${booking.id}, amount: ${amount} as the booking has no initial payment reference`);
      }
    } catch (err) {
      sails.log.error(err);
    }
    return null;
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
   * Online payment amount paid
   */
  amountPaid: (session) => {
    let amountPaid = 0;
    try {
      if (session.display_items) {
        amountPaid = (session.display_items[0].amount / 100) * session.display_items[0].quantity;
      } else {
        amountPaid = session.amount_total / 100;
      }
    } catch (err) {
      sails.log.error(`Unable to determine amount paid from session ${session}`);
    }
    return amountPaid;
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
                  sails.log.debug(`Successfully fetched checkout session for ${req.query.session_id} (booking: ${booking.id} event: ${booking.event.id} paymentReference: ${booking.paymentReference})`);
                } else {
                  sails.log.error(`Failed to fetch session for ${req.query.session_id} (booking: ${booking.id} event: ${booking.event.id})`);
                }
                const paymentMap = booking.paymentReference ? JSON.parse(booking.paymentReference) : {};
                if (session && !paymentMap[session.payment_intent]) {
                  sails.log.debug(`Online payment - flagging booking ${booking.id} as paid etc ${JSON.stringify(session)}`);
                  // Update the booking
                  const amountPaid = sails.controllers.payment.amountPaid(session);
                  booking.amountPaid += amountPaid;
                  paymentMap[session.payment_intent] = amountPaid;
                  paymentReference = JSON.stringify(paymentMap);
                  Booking.update(booking.id, {
                    paymentReference,
                    paid: true,
                    mop: 'Online',
                    amountPaid: booking.amountPaid
                  }).exec((err) => {
                    if (err) {
                      sails.log.error(`Online payment - failed to find booking to update for id ${booking.id}`);
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
          // If we have had no payments at all, cancel the booking
          if (booking.amountPaid <= 0) {
            Booking.destroy({ id: booking.id }).exec(async (err) => {
              if (err) {
                sails.log.error(`Unable to destroy booking for payment reference ${sessionId}`);
              } else {
                const session = await sails.controllers.payment.getCheckoutSession(req.query.session_id, bookings[0].event.id);
                if (session) {
                  const amountPaid = sails.controllers.payment.amountPaid(session);
                  sails.log.debug(`Fetching event for cancelled booking using id ${booking.event.id}`);
                  Event.findOne(booking.event.id)
                    .populate('organiser')
                    .populate('organiser2')
                    .exec(async (err, event) => {
                      if (err) {
                        sails.log.error(`Error occurred fetching event`);
                        sails.log.error(err);
                      } else {
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
                      }
                    });
                } else {
                  sails.log.error('No checkout session found!');
                }
              }
            });
          } else {
            // Thge booking remains partially paid
          }
        }
      });
    res.view('dashboard', {
      appUpdateRequested: false,
      mimicUserRequested: false
    });
  }

};

