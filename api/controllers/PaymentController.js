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
	getStripe: async (event) => {

		const getStripeObject = (event) => {
			const paymentConfig = sails.config.events.onlinePaymentPlatforms[event.onlinePaymentPlatform]
				.find(config => config.code === event.onlinePaymentConfig);
			return require("stripe")(paymentConfig.secretKey);
		}

		return new Promise((resolve, reject) => {
			if (event.id) {
				// Already a populated event object
				return resolve(getStripeObject(event));
			} else {
				Event.findOne(eventId).exec(function (err, event) {
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
	getCheckoutSession: async (req, res) => {
		try {
			const { sessionId, eventId } = req.query;
			const stripe = await sails.controllers.payment.getStripe(eventId);
			const session = await stripe.checkout.sessions.retrieve(sessionId);
			res.send(session);
		} catch (err) {
			return res.negotiate(err);
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
	},

	/**
	 * Online payment cancelled
	 */
	paymentCancelled: async (req, res) => {
		sails.log.debug('Payment cancelled');
	}

};

