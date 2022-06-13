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
			if (!event.onlinePaymentPlatform) {
				throw new Error(`Unable to find payment config. No payment platform on event.`);
			}
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

		const event = await sails.controllers.payment.resolveEvent(eventArg);

		return getStripeObject(event);
	},

	resolveEvent: async (eventArg) => {
		return new Promise((resolve, reject) => {
			try {
				if (eventArg.id) {
					// Already a populated event object
					return resolve(eventArg);
				} else {
					Event.findOne(eventArg)
						.populate('organiser')
						.populate("organiser2")
						.exec(function (err, event) {
							if (err) {
								return reject(err);
							}
							try {
								return resolve(event);
							} catch (err) {
								return reject(err);
							}
						});
				}
			}
			catch (err) {
				return reject(err);
			}
		});
	},

  resolveBookingUser: async (userArg) => {
		return new Promise((resolve, reject) => {
			try {
				if (userArg.id) {
					// Already a populated event object
					return resolve(userArg);
				} else {
					User.findOne(userArg)
						.exec(function (err, user) {
							if (err) {
								return reject(err);
							}
							try {
								return resolve(user);
							} catch (err) {
								return reject(err);
							}
						});
				}
			}
			catch (err) {
				return reject(err);
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
							sails.log.debug(`Getting Stripe session for booking ref ${booking.ref} - places ${booking.place} `);
							// The amount to pay (for a new booking) will be the event price multiplied
							// by the number of places
							let name = booking.event.name;
							let quantity = booking.places;
              let amount = Math.round(booking.event.price * 100);
							if (booking.amountPaid) {
								// This means that by hook or by crook the booking has acquired a different cost.
								// Normally if this is just as a result of adding guests the value to collect will
                // just be the event cost multiplied by the extra guests.  However, if the balance is
                // is as a result of the event changing price we have to be a bit circumspect and just use the
                // quantity as 1 and the balance.
								const balance = booking.cost - booking.amountPaid;
								quantity = balance / booking.event.price;
                if (!Number.isInteger(quantity)) {
                  quantity = 1;
                  amount = Math.round(balance * 100);
                  sails.log.debug(`Sticking with an integer amount of ${amount} and a quantity of 1 because the balance divided by ${booking.event.price} is not an integer.`);
                } else {
                  sails.log.debug(`Quantity calculated as ${quantity} with an integer amount of ${amount}.`);
                }
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
											amount
										}
									],
									customer_email: booking.user.email,
									client_reference_id: booking.ref,
									// ?session_id={CHECKOUT_SESSION_ID} means the redirect will have the session ID set as a query param
									success_url: `${domainURL}paymentsuccess?session_id={CHECKOUT_SESSION_ID}`,
									cancel_url: `${domainURL}paymentcancelled?session_id={CHECKOUT_SESSION_ID}`
								});
							} else {
								sails.log.debug(`Not got Stripe session for booking ref ${booking.ref}. The booking is in credit.`);
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
	getCheckoutSession: async (sessionId, event) => {
		try {
			sails.log.debug(`Getting Stripe for event id ${event.id ? event.id : event}`);
			const stripe = await sails.controllers.payment.getStripe(event);
			sails.log.debug(`Getting checkout session details for session id ${sessionId}`);
			return await stripe.checkout.sessions.retrieve(sessionId);
		} catch (err) {
			sails.log.error(err);
			return null;
		}

	},

  /**
   * Refund diagnostic email for the organiser
   */
  refundDiagnosticEmail: async(booking, amount, refundDiag)=> {
    // Send email to organiser
    setTimeout(async function () {
      const event = await sails.controllers.payment.resolveEvent(booking.event);
      Email.send(
        "onlineRefundDiagnostic",
        {
          senderName: sails.config.events.title,
          refundAmount: amount,
          bookingObject: JSON.stringify(booking),
          refundObject: typeof refundDiag === 'string' ? refundDiag : JSON.stringify(refundDiag)
        },
        {
          from: event.name + ' <' + sails.config.events.email + '>',
          to: sails.controllers.booking.bookingBCC(booking, [event.organiser, event.organiser2, sails.config.events.developer]),
          subject: 'Event booking refund failure - diagnostics'
        },
        function (err) {
          Utility.emailError(err);
        }
      );
    }, 1000);
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
					refundMap[refund.id] = refund.amount / 100;
					const refundReference = JSON.stringify(refundMap);
					const amountPaid = booking.amountPaid - (refund.amount / 100);
					paid = booking.cost <= amountPaid;
					Booking.update(booking.id, {
						refundReference,
						paid,
						amountPaid
					}).exec((err) => {
						if (err) {
							sails.log.error(`Online refund - failed to update booking to update for id ${booking.id}`);
							sails.log.error(err);
							return reject(err);
						}
						return resolve()
					});
				} else {
          sails.controllers.payment.refundDiagnosticEmail(booking, (refund.amount / 100), refund);
          return reject(`Online refund attempt failed!: ${JSON.stringify(refund)}`);
				}
			} catch (err) {
				return reject(err);
			}
		});
	},

  /**
   * returns a refund map to process
   **/
  getRefundMap: (booking, paymentMap, refundAmount) => {
    // Traverse our payment references until we exhaust the amount we need to refund
    const refundMap = {};
    let amountLeft = refundAmount;
    const keys = Object.keys(paymentMap);
    keys.every((paymentReference) => {

      if (paymentMap[paymentReference] >= amountLeft) {
        // This payment reference can fully cover the refund
        refundMap[paymentReference] = amountLeft;
        // Reduce theh payment reference accordingly
        paymentMap[paymentReference] = paymentMap[paymentReference] - amountLeft;
        amountLeft = 0;
      } else {
        // Can this payment reference can partially cover the refund?
        if (paymentMap[paymentReference] > 0) {
          refundMap[paymentReference] = paymentMap[paymentReference];
          amountLeft -= paymentMap[paymentReference];
          paymentMap[paymentReference] = 0;
        }
      }
      return (amountLeft > 0);
    });
    // If we have any left unrefundable we have a problem!
    if (amountLeft) {
      sails.log.error(`Cannot issue refund for booking ${booking.id}, amount: ${refundAmount} as the booking payment references do not cover the refund amount`);
      return null;
    }
    return refundMap;
  },

  emailRefundFailure: (booking, event, amount) => {
    sails.log.error(`Online refund attempt failed!. Sending failure email.`)
      Email.send(
        "onlineRefundFailure",
        {
          recipientName: Utility.recipient(booking.user.salutation, booking.user.firstName, booking.user.surname),
          senderName: sails.config.events.title,
          refundAmount: amount
        },
        {
          from: event.name + ' <' + sails.config.events.email + '>',
          to: booking.user.email,
          bcc: sails.controllers.booking.bookingBCC(booking, [event.organiser, event.organiser2, sails.config.events.developer]),
          subject: 'Event booking refund failed!'
        },
        function (err) {
          Utility.emailError(err);
        }
      );
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
        sails.log.debug(`=======Issuing Refund for booking ref ${booking.ref} for £${amount}=======`)
				const event = await sails.controllers.payment.resolveEvent(booking.event);
        booking.user = await sails.controllers.payment.resolveBookingUser(booking.user);
				sails.log.debug(`Getting Stripe for event id ${event.id}`);
				const stripe = await sails.controllers.payment.getStripe(event.id);
				sails.log.debug(`Issuing refund(s) for booking ${booking.id} for £${amount}`);

				// Build a map of our payment references (intents)
				let paymentMap;
				try {
					paymentMap = booking.paymentReference ? JSON.parse(booking.paymentReference) : {};
				} catch (err) {
					// Cannot process refund
					sails.log.error(`Cannot issue refund for booking ${booking.id}, amount: ${amount} as the booking payment reference ${booking.paymentReference} is in the wrong format`);
					return null;
				}

				// Traverse our payment references until we exhaust the amount we need to refund
				let refundMap = sails.controllers.payment.getRefundMap(booking, paymentMap, amount);
				if (!refundMap) {
          // Email refund failure
          sails.controllers.payment.emailRefundFailure(booking, event, amount);
          return null;
        }

				// Traverse the refund map and issue the refunds
				let ok = true;
        let refundError;
        let refund;
        let amountToBeRefunded = amount;
        let retry = true;
        while (retry) {
          retry = false;
          for (const refundReference of Object.keys(refundMap)) {
            if (refundMap && !retry) {
              // If retry becomes true we are just going to abandon this loop
              if (refundMap[refundReference]) {
                try {
                  refund = await stripe.refunds.create({
                    payment_intent: refundReference,
                    amount: Math.round(refundMap[refundReference] * 100)
                  });
                  amountToBeRefunded -= refundMap[refundReference];
                } catch (err) {
                  sails.log.error(err);
                  // If this is because the payment reference we tried has already been refunded, see if we can use a different one
                  if (err.raw && err.raw.code === 'charge_already_refunded') {
                    paymentMap[refundReference] = 0;
                    sails.log.debug('Trying a different charge to refund');
                    refundMap = sails.controllers.payment.getRefundMap(booking, paymentMap, amountToBeRefunded);
                    retry = !!refundMap;
                  }
                  if (!retry) {
                    refundError = err;
                    ok = false;
                  }
                }
                if (!retry) {
                  if (ok) {
                    await sails.controllers.payment.processRefund(booking, refund);
                  } else {
                    sails.controllers.payment.refundDiagnosticEmail(booking, amount, refundError)
                  }
                }
              }
            }
          }
        }

				// Update the payment reference map on the booking
				const paymentReference = JSON.stringify(paymentMap);
				if (ok) {
					try {
						Booking.update(booking.id, {
							paymentReference: paymentReference
						}).exec((err) => {
							if (err) {
								sails.log.error(`Online refund - failed to find booking to update for id ${booking.id}`);
							}
							sails.log.debug(`Successfully updated refund details on booking ${booking.id} amount ${amount}. Sending confirmation email.`)
							Email.send(
								"onlineRefundSuccess",
								{
									recipientName: Utility.recipient(booking.user.salutation, booking.user.firstName, booking.user.surname),
									senderName: sails.config.events.title,
									amountRefunded: amount,
									booking,
									event: event
								},
								{
									from: event.name + ' <' + sails.config.events.email + '>',
									to: booking.user.email,
									bcc: sails.controllers.booking.bookingBCC(booking, [event.organiser, event.organiser2, sails.config.events.developer]),
									subject: 'Event booking refund processed'
								},
								function (err) {
									Utility.emailError(err);
								}
							);
						});
					} catch (err) {
						Utility.emailError(err);
					}
				} else {
					// Email refund failure
          sails.controllers.payment.emailRefundFailure(booking, event, amount);
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
    return Number(amountPaid.toFixed(2));
	},

  /**
	 * Online payment issue
	 */
	handlePaymentIssue: async (booking, event, msg) => {
    if (booking && event) {
      sails.log.error(`Online payment attempt failed!. Sending failure email.`);
      Email.send(
        "onlinePaymentFailure",
        {
          recipientName: Utility.recipient(booking.user.salutation, booking.user.firstName, booking.user.surname),
          senderName: sails.config.events.title,
          msg
        },
        {
          from: event.name + ' <' + sails.config.events.email + '>',
          to: booking.user.email,
          bcc: sails.controllers.booking.bookingBCC(booking, [event.organiser, event.organiser2, sails.config.events.developer]),
          subject: 'An unexpected error occurred processing online payment'
        },
        function (err) {
          Utility.emailError(err);
        }
      );
    }
  },

	/**
	 * Online payment success
	 */
	paymentSuccess: async (req, res) => {
		sails.log.debug(`=======Successful payment ${req.query.session_id}=======`);
    try {
      Booking.find({ paymentSessionId: req.query.session_id })
			.populate('event')
			.populate('user')
			.exec(async (err, bookings) => {
				if (err || !bookings || bookings.length === 0) {
          const msg = `Online payment - failed to retrieve booking for ${req.query.session_id}`;
					sails.log.error(msg);
					sails.log.error(err);
					sails.controllers.payment.handlePaymentIssue(null, null, msg);
				} else {
					const booking = bookings[0];
          sails.log.debug(`Successfully found booking ref ${booking.ref} for session id ${req.query.session_id}`);
					Event.findOne(booking.event.id)
						.populate('organiser')
						.populate('organiser2')
						.exec(async (err, event) => {
							if (err) {
                const msg = `Online payment - failed to retrieve event for booking ${booking.event.id}`;
								sails.log.error(msg);
								sails.log.error(err);
								sails.controllers.payment.handlePaymentIssue(booking, null, msg);
							}
							else {
                sails.log.debug(`Successfully found event "${event.name}" (id: ${event.id}) for ${booking.ref} for session id ${req.query.session_id}`);
								const session = await sails.controllers.payment.getCheckoutSession(req.query.session_id, booking.event.id);
								if (session) {
									sails.log.debug(`Successfully fetched checkout session for ${req.query.session_id} (booking: ${booking.id} event: ${booking.event.id} paymentReference: ${booking.paymentReference})`);
								} else {
                  const msg = `Failed to fetch session for ${req.query.session_id} (booking: ${booking.id} event: ${booking.event.id})`;
									sails.log.error(msg);
                  sails.controllers.payment.handlePaymentIssue(booking, event, msg);
								}
								const paymentMap = booking.paymentReference ? JSON.parse(booking.paymentReference) : {};
                if (session) {
                  if (!paymentMap[session.payment_intent]) {
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
                        const msg = `Online payment - failed to find booking to update for id ${booking.id}`;
                        sails.log.error(msg);
                        sails.log.error(err);
                        sails.controllers.payment.handlePaymentIssue(booking, event, msg);
                      }
                      sails.log.debug(`Successfully updated payment details on booking ${booking.id}. Sending confirmation email.`);
                      Email.send(
                        "onlinePaymentSuccess",
                        {
                          recipientName: Utility.recipient(booking.user.salutation, booking.user.firstName, booking.user.surname),
                          senderName: sails.config.events.title,
                          amountPaid,
                          booking,
                          event
                        },
                        {
                          from: event.name + ' <' + sails.config.events.email + '>',
                          to: booking.user.email,
                          bcc: sails.controllers.booking.bookingBCC(booking, [event.organiser, event.organiser2, sails.config.events.developer]),
                          subject: 'Event booking payment processed'
                        },
                        function (err) {
                          Utility.emailError(err);
                        }
                      );

                    });
                  } else {
                    sails.log.warn(`Online payment for booking ${booking.id} reference ${session.payment_intent} already processed!`);
                  }
                }
							}
						});
				}
			});
    } catch (err) {
      sails.log.error('Unexpected error occurred processing payment');
      sails.log.error(err);
    }
    return sails.controllers.booking.myBookings(req, res);
	},

	/**
	 * Online payment cancelled
	 */
	paymentCancelled: async (req, res) => {
		sails.log.debug('=======Payment cancelled=======');
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
						// The booking remains partially paid
					}
				}
			});
      return sails.controllers.booking.myBookings(req, res);
	}

};

