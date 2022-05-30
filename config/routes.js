/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#!/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, *
  * etc. depending on your default view engine) your home page.              *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

  //'/': {
  //  view: 'homepage'
  //}

  'get /typescript': 'SomeController.hello',
  // Application control
  'get /updateappconfirmation': 'AppController.updateAppConfirmation',
  'get /updateapp': 'AppController.updateApp',

  // Passport control
  'get /homepage': 'AuthController.homepage',
  'get /dashboard': 'AuthController.dashboard',
  'get /logout': 'AuthController.logout',
  'get /register': 'AuthController.register',
  'get /privacy': 'AuthController.privacy',

  'post /auth/local': 'AuthController.callback',
  'post /auth/local/:action': 'AuthController.callback',

  'get /auth/:provider': 'AuthController.provider',
  'get /auth/:provider/callback': 'AuthController.callback',

  // Normal processing
  'get /': 'PageController.validateRequest',

  // Profiles
  'get /profile': 'AuthController.profile',
  'post /updateprofile': 'AuthController.updateProfile',
  'get /reset': {view:'reset'},
  'post /auth/passwordreset': 'AuthController.passwordReset',

  // Bookings
  'get /booking' : 'BookingController.prepareBooking',
  'get /booking/:action': 'BookingController.prepareBooking',
  'get /mybookings': 'BookingController.myBookings',
  'get /allmybookings/:criteria?': 'BookingController.allMyBookings',  // the ? in :criteria? means that the filter part or the URL is optional
  'get /eventbookings': 'BookingController.eventBookings',
  'get /alleventbookings/:criteria?': 'BookingController.allEventBookings',
  'get /userbookings': 'BookingController.userBookings',
  'get /alluserbookings/:criteria?': 'BookingController.allUserBookings',
  'post /makebooking': 'BookingController.makeBooking',
  'post /makebooking/:action?': 'BookingController.makeBooking',
  'get /linkedbooking/:bookingid': 'LinkedBookingController.linkedBookings',
  'post /validateadditions': 'BookingController.validateAdditions',
  'post /updatebooking/:action': 'BookingController.updateBooking',
  'post /verifybypasscode': 'EventController.verifyBypassCode',
  'post /booking/transfer': 'BookingController.transferBookings',
  'get /lodgeroom': 'BookingController.lodgeRoom',
  'post /addpd/:eventid': 'BookingController.addPD',

  // Online payments
  'get /paymentsuccess': 'PaymentController.paymentSuccess',
  'get /paymentcancelled': 'PaymentController.paymentCancelled',

  // Apologies
  'get /apology': 'ApologyController.prepareApology',
  'get /apology/:action': 'ApologyController.prepareApology',
  'post /sendapology': 'ApologyController.sendApology',
  'get /eventapologies': 'ApologyController.eventApologies',
  'get /alleventapologies/:filter?': 'ApologyController.allEventApologies',

  // Log
  'get /log': 'LogController.download',
  'post /log/:action': 'LogController.process',

  // Users
  'get /users': 'UserController.users',
  'get /allusers/:criteria?': 'UserController.allUsers',  // the ? in :criteria? means that the filter part or the URL is optional
  'get /usermaint/:action': 'UserController.prepareUser',
  'post /updateuser/:action': 'UserController.updateUser',
  'get /organisers': 'UserController.organisers',
  'get /dcs': 'UserController.dcs',
  'get /mimicuserrequested': 'UserController.mimicUserRequested',
  'post /mimicuser': 'UserController.mimicUser',

  // Other orders
  'get /otherorders/:userid': 'OrderController.otherOrders',

  // Events
  'get /events': 'EventController.events',
  'get /openevents': 'EventController.openEvents',
  'get /allevents/:criteria?': 'EventController.allEvents',  // the ? in :criteria? means that the filter part or the URL is optional
  'get /event/:action': 'EventController.prepareEvent',
  'post /updateevent/:action': 'EventController.updateEvent',

  /***************************************************************************
  *                                                                          *
  * Custom routes here...                                                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the custom routes above, it   *
  * is matched against Sails route blueprints. See `config/blueprints.js`    *
  * for configuration options and examples.                                  *
  *                                                                          *
  ***************************************************************************/

};
