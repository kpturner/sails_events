/**
 * ApologyController
 *
 * @description :: Server-side logic for managing Apologies
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	/**
	 * Event apologies
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	eventApologies: function(req, res) {
		Event.findOne(req.param("eventid")).populate("organiser").populate("organiser2").exec(function(err,event){
			res.locals.event=Utility.sanitiseEventDates(event);
			res.view('apologies',{
			  filter: req.session.apologyFilter,
			  errors: req.flash('error')
			});
		})
	},

	/**
	 * Send an apology
	 */
	sendApology: function(req, res) {
		// Simply create the apology
		var apology={};
		apology.event=req.param("eventid");
		var selectedUserId=req.param("selecteduserid"); //Only populated when an admin is making an apology on behalf of someone else
		apology.user=(selectedUserId)?selectedUserId:res.locals.user.id;
		apology.message=req.param("message");
		Apology.create(apology).exec(function(err, newApology){
			User.findOne(apology.user).exec(function(err,apologiser){
				// Email the organiser
				Event.findOne(apology.event).populate("organiser").populate("organiser2").exec(function(err,event){
					if (!err && event) {
						event= Utility.sanitiseEventDates(event);
						var formattedDate=event.date.toString();
						formattedDate=formattedDate.substr(0,formattedDate.indexOf("00:00:00"));
						if (newApology.message==null) {
							newApology.message=""
						}
						Utility.augmentUser(event,apologiser,function(augmentedUser){
							apologiser=augmentedUser;
							Email.send(
								"apology",
								{
									event:event,
									eventDate: formattedDate,
									user:apologiser,
									apology:newApology
								},
								{
									to: event.organiser.email || "",
									bcc: (sails.config.events.emailDeveloperOnBooking && sails.config.events.developer) || "",
									subject: event.name+": An apology"
								},
								function(err) {if (err) console.log(err);}
								)
						})

					}
				})
			})


			// Return
			return res.ok();

		})
	},

	/**
	 * Prepare data for apology  (my first real delve in bluebird promises)
	 */
	prepareApology:function(req, res) {
		var eventId=req.param("eventid");
		var action=req.param("action");
		var selectedUserId=req.param("selecteduserid"); //Only populated when an admin is making an apology on behalf of someone else
		var userBookings=(req.param("userbookings"))?true:false;
		var mode="create";
		if (action)
			mode=action.substr(0,1).toUpperCase()+action.substr(1);

		var response=function(){
			// Return to view
			if (req.wantsJSON)
				return res.json({
						model:'apology',
						mode: mode
					});
			else
				return res.view("apology",{
						model:'apology',
						mode: mode
					});
		}

		Event.findOne(eventId).populate('organiser').populate("organiser2")
			.then(function(event){
				// Return a promise, or rather an array that can be used by a .spread
				if (event) {
					res.locals.event= Utility.sanitiseEventDates(event);
					res.locals.bookingId=null;
					res.locals.apologyId=null;
					res.locals.selectedUserId=(selectedUserId)?selectedUserId:"";
					// Does a booking exist?
					return 	[
								event,
								Booking.findOne({
									event: event.id,
									user: (selectedUserId)?selectedUserId:res.locals.user.id,
								})
							]
				}
				else {
					// No Event!!
					return [null,null]
				}
			})
			// The next ".spread" will be processing the "event" and "Booking.findOne" bluebird promise above
			.spread(function(event, booking){
				// Return a promise, or rather an array that can be used by a .spread
				if (event) {
					if (booking) {
						res.locals.bookingId=booking.id;
						return	[
									event,
									{}
								]
					}
					else {
						// Does an apology already exist?
						return	[
									event,
									Apology.findOne({
										event: event.id,
										user: (selectedUserId)?selectedUserId:res.locals.user.id,
									})
								]
					}
				}
				else {
					// No Event!!
					return [null,null]
				}
			})
			// The next ".then" will be processing the "event" and "Apology.findOne" bluebird promise above
			.spread(function(event,apology){
				if (event) {
					res.locals.apology=apology || {};
					return response();
				}
				else {
					res.view('dashboard',{
						appUpdateRequested: false,
						mimicUserRequested: false
					});
				}
			})
			.catch(function(err){
				return res.negotiate(err);
			})


	},

	/**
	 * Get all event apologies
     *
	 * @param {Object} req
	 * @param {Object} res
	 */
	allEventApologies: function (req, res) {


		var filter=req.param('filter');
		req.session.bookingFilter=filter;
		var download=req.param('download');

		var where = {};
		where.event=req.param("eventid");

		if (filter && filter.length>0) {
			where.or= 	[
							{user:{surname: {contains: filter}}},
							{user:{firstName: {contains: filter}}},
							{user:{lodge: {contains: filter}}},
							{user:{lodgeNo: {contains: filter}}},

						]

		}




		Apology.find({
						where: where,
						// NOTE: Sorting by the surname/name of the foreign "user" table as shown below does not appear to work at all.
						//       We will have to sort it after getting the data set
						//sort: {
						//		user: {
						//			surname:'asc',
						//			firstName:'asc'
						//		}
						//}
					}
			)
			.populate('user') // Sorting a "populate" by more than one field doesn't seem to work. You get no results at all.
			.populate("event")
			.exec(function(err, apologies){
				if (err) {
					sails.log.verbose('Error occurred trying to retrieve apologies.');
					return res.negotiate(err);
				}

				// Augment apologies based on order
				var newApologies=[];
				async.each(apologies,function(apology,next){
					var b=apology;
					if (apology.event.order && apology.event.order!="C") {
						Utility.augmentUser(apology.event,apology.user,function(augmentedUser){
							b.user=augmentedUser;
							b.orderLabel=augmentedUser.orderLabel;
							newApologies.push(b);
							next();
						})
					}
					else {
						b.orderLabel="Lodge";
						newApologies.push(b);
						next();
					}
				},function(err){
					apologies=newApologies;
					// Sort response by user surname (case insensitive)
					apologies.sort(Utility.jsonSort("user.surname", false, function(a){return a.toUpperCase()}))


					if (download) {
						Event.findOne(req.param("eventid")).exec(function(err,event){
							sails.controllers.apology.download(req, res, event.code+"_apologies", apologies);
						})
					}
					else {
						// If session refers to a user who no longer exists, still allow logout.
						if (!apologies) {
							return res.json({});
						}

						return res.json(apologies);
					}
				})

			})


	},

	/**
	 * Download apologies
	 */
	 download: function(req, res, prefix, apologies) {
	 	if (!apologies) {
			apologies=[]
		}

		// Create basic options
		var options={};
		options.filename=prefix+'_' + ((new Date().getTime().toString())) + '.csv';
		//options.nested=true;

		// Build a custom JSON for the CSV
		var data=[];

		apologies.forEach(function(apology,i){
			var row={};
			row.salutation=apology.user.salutation || "";
			row.surname=apology.user.surname || "";
			row.firstName=apology.user.firstName || "";
			row.message=apology.message || "";
			data.push(row);
		})
		// Re-use the bookings function
		Utility.sendCsv(req, res, data, options)
	 },

};

