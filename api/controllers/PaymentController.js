/**
 * PaymentController
 *
 * @description :: Server-side logic for managing online payments
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	/**
	 * Get initialised stripe object
	 */
	getStripe: async (eventArg) => {

		const getStripeObject = (event) => {
			const paymentConfig = sails.config.events.onlinePaymentPlatforms[event.onlinePaymentPlatform]
				.find(config => config.code === event.onlinePaymentConfig);
			return require("stripe")(paymentConfig.secretKey);
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
						const stripe = await sails.controllers.payment.getStripe(booking.event);

						const domainURL = sails.config.proxyHost;

						// Create new Checkout Session for the order
						// Other optional params include:
						// [billing_address_collection] - to display billing address details on the page
						// [customer] - if you have an existing Stripe Customer ID
						// [payment_intent_data] - lets capture the payment later
						// [customer_email] - lets you prefill the email input in the form
						// For full details see https://stripe.com/docs/api/checkout/sessions/create
						session = await stripe.checkout.sessions.create({
							payment_method_types: ['card'],
							locale: 'en',
							line_items: [
								{
									name: booking.event.name,
									description: booking.event.blurb,
									quantity: booking.places,
									currency: 'gbp',
									amount: booking.event.price * 100,
								}
							],
							customer_email: booking.user.email,
							client_reference_id: booking.ref,
							// ?session_id={CHECKOUT_SESSION_ID} means the redirect will have the session ID set as a query param
							success_url: `${domainURL}paymentsuccess?session_id={CHECKOUT_SESSION_ID}`,
							cancel_url: `${domainURL}paymentcancelled`
						});

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
		const stripe = await sails.controllers.payment.getStripe(eventId);
		return await stripe.checkout.sessions.retrieve(sessionId);
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
		Booking.find({ paymentSessionId: req.query.session_id }).exec(async (err, bookings) => {
			if (err) {
				return res.negotiate(err);
			}
			try {
				const session = await sails.controllers.payment.getCheckoutSession(req.query.session_id, bookings[0].event);
				// Update the booking
				Booking.update(bookings[0].id, { 
					paymentReference: session.payment_intent,
					paid: true,
					mop: 'Online',
					amountPaid: session.display_items[0].amount / 100 
				}).exec(()=> {
					res.view('dashboard',{
						appUpdateRequested: false,
						mimicUserRequested: false
					});
				});
			} catch (err) {
				return res.negotiate(err);
			}
		});	
	},

	/**
	 * Online payment cancelled
	 */
	paymentCancelled: async (req, res) => {
		sails.log.debug('Payment cancelled');
		Booking.destroy({ paymentSessionId: sessionId }).exec(async (err) => {
			if (err) {
				return res.negotiate(err);
			}
			res.view('dashboard',{
				appUpdateRequested: false,
				mimicUserRequested: false
			});
		});	
	}

};

