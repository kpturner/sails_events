angular.module('EventsModule').controller('BookController', ['$scope', '$http', 'toastr', 'ngDialog', function ($scope, $http, toastr, ngDialog) {


	$scope.bookingForm = {
		loading: false,
		transferring: false,
	}


	// Initialise "user" in the scope with the data set in the view script
	$scope.user = SAILS_LOCALS.user;
	$scope.event = SAILS_LOCALS.event;
	$scope.mode = SAILS_LOCALS.mode;
	$scope.selectedUserId = SAILS_LOCALS.selectedUserId; // Only populated when the administrator is making a booking on behalf of another user

	// Lodge required
	$scope.lodgeMandatory = SAILS_LOCALS.lodgeMandatory;

	// Order label
	if ($scope.event.order && $scope.event.order != "C") {
		SAILS_LOCALS.orders.forEach(function (cfg) {
			if ($scope.event.order == cfg.code) {
				$scope.orderlabel = (cfg.label) ? cfg.label : "Lodge";
				return false;
			}
		})
		if (!$scope.orderlabel) {
			$scope.orderlabel = "Lodge";
		}
	}
	else {
		$scope.orderlabel = "Lodge";
	}

	// Enable a repeater for additional attendees
	$scope.linkedbookings = [];
	$scope.linkedbookingsArr = [];

	// makeArray is called every time the number of places changes
	$scope.makeArray = function () {
		$scope.linkedbookingsArr.length = 0;
		for (var i = 0; i < (parseInt($scope.bookingForm.places) - 1); i++) {
			$scope.linkedbookingsArr.push(i);
		}
	}

	// addGuest - a button to simply increment the number of places
	$scope.addGuest = function () {
		$scope.bookingForm.places += 1;
		$scope.makeArray();
	}

	// RemoveGuest - Remove a guest
	$scope.removeGuest = function ($event) {
		var index = parseInt($($event.target).attr("name").replace("heading_", ""));
		$scope.linkedbookingsArr.pop();
		$scope.linkedbookings.splice(index, 1);
		$scope.bookingForm.places -= 1;
	}

	// Build a list of MOPs from the config for the MOP dropdown
	//$scope.mops=[];
	//$.each(SAILS_LOCALS.mops, function(){
	//	var mop=this.toString();
	//	var mopObj={};
	//	mopObj.id=mop;
	//	mopObj.name=mop;
	//	$scope.mops.push(mopObj);
	//});
	$scope.mops = SAILS_LOCALS.mops;

	/**
	 * Initialise lodge info based on order
	 */
	$scope.initialiseLodgeInfo = function (userId, userOrders) {

		// <ake sure lodge numbers are numeric before starting
		$scope.bookingForm.lodgeNo = parseInt($scope.bookingForm.lodgeNo);
		if ($scope.bookingForm.voLodgeNo) {
			$scope.bookingForm.voLodgeNo = parseInt($scope.bookingForm.voLodgeNo);
		}

		// First of all get the users orders if not passed
		if (userOrders) {
			setInfo(userOrders)
		}
		else {
			// Get users other orders (if any)
			$http.get("/otherorders/" + userId).success(function (data, status) {
				if (typeof data == 'object') {
					setInfo(data);
				}
			})
				.error(function (data, status, headers, config) {
					console.log("Error retrieving other orders " + SAILS_LOCALS.userDetails.id)
				});
		}

		function setInfo(userOrders) {
			$scope.userOrders = userOrders;
			if ($scope.event.order && $scope.event.order != "C") {
				// Overwrite the lodge info with the relevant order info
				userOrders.forEach(function (order) {
					if ($scope.event.order == order.code) {
						$scope.bookingForm.lodge = order.name;
						$scope.bookingForm.lodgeNo = parseInt(order.number);
						$scope.bookingForm.lodgeYear = order.year;
						$scope.bookingForm.salutation = order.salutation;
						$scope.bookingForm.centre = order.centre;
						$scope.bookingForm.area = order.area;
						$scope.bookingForm.rank = order.rank;
						return false;
					}
				})
			}
			else {
				// Convert lodge no to numeric
				$scope.bookingForm.lodgeNo = parseInt($scope.bookingForm.lodgeNo);
			}
			if ($scope.bookingForm.voLodgeNo) {
				$scope.bookingForm.voLodgeNo = parseInt($scope.bookingForm.voLodgeNo);
			}
		}


	}

	// Do we have an existing booking to edit?
	$scope.existingBooking = false;
	$scope.deadline = SAILS_LOCALS.booking.deadline;
	$scope.myBookings = SAILS_LOCALS.myBookings;
	$scope.eventBookings = SAILS_LOCALS.eventBookings;
	var maxPlaces = ($scope.event.maxBookingPlaces == 1) ? $scope.event.maxBookingPlaces :
		($scope.user.isAdmin || (($scope.event.organiser && $scope.user.id == $scope.event.organiser.id) || ($scope.event.organiser2 && $scope.user.id == $scope.event.organiser2.id))) ? ($scope.event.maxBookingPlaces * 2) :
			$scope.event.maxBookingPlaces;
	$scope.placesMax = ($scope.event.capacity >= maxPlaces) ? maxPlaces : $scope.event.capacity;
	$scope.placesMin = $scope.event.minBookingPlaces || 1;

	if ($scope.placesMin > $scope.placesMax) {
		$scope.placesMin = $scope.placesMax
	}
	if ($scope.mode != "create") {
		if (SAILS_LOCALS.booking.id) {
			$scope.bookingForm = SAILS_LOCALS.booking.user;
			// Is the administrator managing a booking for somebody else?
			if (SAILS_LOCALS.booking.user.id != $scope.user.id) {
				$scope.userBookings = true;
				$scope.selectedUserId = SAILS_LOCALS.booking.user.id;
			}
			$scope.initialiseLodgeInfo(SAILS_LOCALS.booking.user.id);
			// In this case we can allow the maximum places to be the same as the number of places on the booking
			// so that (if the event has been changed to have fewer places per booking) we don't cause
			// confusion
			$scope.placesMax = (SAILS_LOCALS.booking.places > $scope.placesMax) ? SAILS_LOCALS.booking.places : $scope.placesMax;
		}
		else {
			$scope.bookingForm = angular.extend($scope.bookingForm, $scope.user);
			$scope.initialiseLodgeInfo($scope.user.id);
		}
		$scope.paidMsg = "";
		// Initialise confirmation email
		$scope.bookingForm.confirmemail = $scope.bookingForm.email;
	}
	else {
		if ($scope.selectedUserId) {
			// Administrator is booking on behalf of another user
			$scope.userBookings = true;
			$http.get("/user/" + $scope.selectedUserId)
				.success(function (data, status) {
					if (!SAILS_LOCALS.booking.id) {
						$scope.bookingForm.places = $scope.placesMin;
					}
					else {
						$scope.bookingForm.places = SAILS_LOCALS.booking.places;
					}
					if ($scope.bookingForm.places > 1)
						$scope.makeArray();
					$scope.bookingForm = angular.extend($scope.bookingForm, data);
					$scope.paidMsg = "";

					$scope.initialiseLodgeInfo($scope.selectedUserId, data.orders);

					// Initialise confirmation email
					$scope.bookingForm.confirmemail = $scope.bookingForm.email;
				})
				.error(function (data, status, headers, config) {
					console.log("Error retrieving selected user for booking " + $scope.selectedUserId)
				});
		}
		else {
			/////Not necessary to do this because we are effectively bookingin a dummy user
			/////$scope.initialiseLodgeInfo($scope.user.id);
		}
	}

	// Open for bookings?
	$scope.openForBookings = true;
	var currentHH = SAILS_LOCALS.nowHH;
	var currentMM = SAILS_LOCALS.nowMM;
	var currentSS = SAILS_LOCALS.nowSS;
	var openingSplit = $scope.event.openingTime ? $scope.event.openingTime.split(':') : '00:00:00';
	var hh = parseInt(openingSplit[0]);
	var mm = parseInt(openingSplit[1]);
	var ss = parseInt(openingSplit[2]);
	var openingTime = (hh * 3600) + (mm * 60) + ss;
	var nowTime = (currentHH * 3600) + (currentSS * 60) + currentSS;
	var pastTheClosingDate = ($scope.event.UTCClosingDate && $scope.event.UTCClosingDate < SAILS_LOCALS.now);
	var notYetReachedOpeningDate = ($scope.event.UTCOpeningDate && $scope.event.UTCOpeningDate > SAILS_LOCALS.now);
	var isOpeningDate = ($scope.event.UTCOpeningDate && $scope.event.UTCOpeningDate === SAILS_LOCALS.now);
	var userBookingHimselfIn = (!$scope.eventBookings && !$scope.userBookings);
  var canAmend = SAILS_LOCALS.isAdmin;
  if (!canAmend) {
    canAmend = SAILS_LOCALS.organiser.username === SAILS_LOCALS.user.username;
    if (!canAmend && SAILS_LOCALS.organiser2 && SAILS_LOCALS.organiser2.username === SAILS_LOCALS.user.username);
  }
	if (!canAmend && pastTheClosingDate ||
		(userBookingHimselfIn && (notYetReachedOpeningDate || (isOpeningDate && $scope.event.openingTime && openingTime > nowTime)))) {
		$scope.openForBookings = false;
	}

	// Warn if not open for bookings
	$scope.bookingForm.bypassCode = "";

	// Check whether or not the booking has been paid for
	$scope.chkPaid = function () {
		if ($scope.openForBookings && !$scope.user.isAdmin && !$scope.user.isOrganiser && !$scope.eventBookings && !$scope.userBookings && $scope.paid && $scope.mode != 'delete') {
			var opts = {
				template: "/templates/paidWarning.html",
				className: 'ngdialog-theme-default',
				scope: $scope
			};

			// Pop the dialog
			ngDialog.open(opts)

		}
	}

	// Check whether or not we are actually open for bookings
	$scope.chkOpenForBookings = function () {
		if (!$scope.openForBookings && $scope.mode != "delete" && (!$scope.event.UTCClosingDate || ($scope.event.UTCClosingDate && $scope.event.UTCClosingDate >= SAILS_LOCALS.now))) {
			var opts = {
				className: 'ngdialog-theme-default'
			};
			var erOpts = $.extend({}, opts);
			opts.template = "/templates/notOpenForBookings.html";
			opts.scope = $scope;
			erOpts.template = "/templates/bypassCodeInvalid.html";
			erOpts.scope = $scope;
			// Pop the dialog
			ngDialog.openConfirm(opts)
				.then(function (value) {
					// Attempting to bypass with a code
					var ok = false;
					$http.post("/verifybypasscode", {
						_csrf: SAILS_LOCALS._csrf,
						id: $scope.event.id,
						bypassCode: $scope.bookingForm.bypassCode
					})
						.success(function (data, status) {
							$scope.openForBookings = true;
						}).
						error(function (data, status, headers, config) {
							ngDialog.open(erOpts)
								.closePromise.then(function (value) {
									$scope.chkOpenForBookings();
								});
						});

				}, function (reason) {
					// Cannot continue
				});
		}
	}

	// Check if open for bookings
	if (!SAILS_LOCALS.booking.id) {
		$scope.chkOpenForBookings();
	}

	// Salutations
	$scope.salutations = SAILS_LOCALS.salutations;

	// User categories
	$scope.userCategories = SAILS_LOCALS.userCategories;


	// Display the payment details & blurb
	$scope.bookingForm.paymentDetails = $scope.event.paymentDetails;
	$scope.bookingForm.blurb = $scope.event.blurb;

	$scope.bookingForm.menu = $scope.event.menu;
	$scope.bookingForm.menu2 = $scope.event.menu2;
	$scope.bookingForm.menu3 = $scope.event.menu3;
	$scope.bookingForm.menu4 = $scope.event.menu4;
	$scope.bookingForm.dressCode = $scope.event.dressCode;

	// Payment reminder info
	if (!$scope.bookingForm.paid) {
		// When is the next reminder due?
		if (SAILS_LOCALS.booking.remindersSent && SAILS_LOCALS.booking.remindersSent > 0) {
			// Add the interval to the last reminder date
			$scope.nextPaymentReminder = new Date();
			$scope.nextPaymentReminder.setDate(new Date(SAILS_LOCALS.booking.lastPaymentReminder).getDate() + SAILS_LOCALS.latePaymentReminderInterval);
			var cd = new Date($scope.event.closingDate);
			if ($scope.nextPaymentReminder > cd) {
				$scope.nextPaymentReminder = cd;
			}
		}
	}

	// Areas
	$scope.areas = SAILS_LOCALS.areas;

	// Centres
	$scope.centres = SAILS_LOCALS.centres;

	if (!$scope.eventBookings && !$scope.userBookings && !$scope.myBookings)
		$scope.makingBooking = true;

	// If we are in "create" mode we should be safe to assume that there
	// will be no existing booking details
	if (SAILS_LOCALS.booking.id) {
		$scope.existingBooking = true;
		$scope.paid = SAILS_LOCALS.booking.paid;
		if ($scope.paid)
			$scope.paidMsg = " AND PAID"
		$scope.bookingForm.ref = SAILS_LOCALS.booking.ref;
		$scope.bookingForm.menuChoice = SAILS_LOCALS.booking.menuChoice;
		$scope.bookingForm.cost = SAILS_LOCALS.booking.cost;
		$scope.bookingForm.paid = SAILS_LOCALS.booking.paid;
		$scope.bookingForm.mop = SAILS_LOCALS.booking.mop;
		$scope.bookingForm.paymentReference = SAILS_LOCALS.booking.paymentReference;
		$scope.bookingForm.tableNo = SAILS_LOCALS.booking.tableNo;
		$scope.bookingForm.amountPaid = SAILS_LOCALS.booking.amountPaid;
		$scope.bookingForm.dietary = SAILS_LOCALS.booking.dietary;
		$scope.bookingForm.info = SAILS_LOCALS.booking.info;
		$scope.bookingForm.places = SAILS_LOCALS.booking.places;
		$scope.bookingForm.remindersSent = SAILS_LOCALS.booking.remindersSent;
		// If the booking has an amount paid and a balance due
		// then the minimum cannot reduce the cost below that amount.
		// The organiser needs to intervene for refunds etc
		$scope.balance = $scope.bookingForm.amountPaid ? ($scope.bookingForm.cost - $scope.bookingForm.amountPaid) : null;
		if ($scope.balance > 0 && !$scope.user.isAdmin && !$scope.user.isOrganiser) {
			$scope.placesMin = (Math.round($scope.bookingForm.amountPaid / $scope.event.price)) || 1;
			if ($scope.placesMin > $scope.bookingForm.places) {
				$scope.placesMin = $scope.bookingForm.places;
			}
		}

		// Make array for additional bookings
		$scope.makeArray();
		// Get linked booking info
		if (SAILS_LOCALS.booking.places > 1) {
			$http.get("/linkedbooking/" + SAILS_LOCALS.booking.id).success(function (data, status) {
				if (typeof data == 'object') {
					$scope.linkedbookings = data;
					if (!$scope.linkedbookings.menuChoice) {
						$scope.linkedbookings.menuChoice = 1;
					}
					$scope.linkedbookings.forEach(function (v, i) {
						$scope.linkedbookings[i].lodgeNo = parseInt($scope.linkedbookings[i].lodgeNo)
					})
				}
			}).
				error(function (data, status, headers, config) {
					console.log("Error retrieving linked bookings for booking " + SAILS_LOCALS.booking.id)
				});

		}


		// Check if paid
		$scope.chkPaid();

	}
	else {
		if (!$scope.selectedUserId) {
			$scope.bookingForm.places = $scope.placesMin;
			if ($scope.bookingForm.places > 1)
				$scope.makeArray();
		}
		if ($scope.event.menusOnOffer <= 1) {
			$scope.bookingForm.menuChoice = 1;
		}
	}


	// Warn if there are potential duplicates
	if (SAILS_LOCALS.potentialDuplicates && SAILS_LOCALS.potentialDuplicates.length > 0) {
		$scope.potentialDuplicates = SAILS_LOCALS.potentialDuplicates;
		// Give the user the chance to pull out
		var opts = {
			template: "/templates/potentialDuplicates.html",
			className: 'ngdialog-theme-default',
			scope: $scope
		};
		// Pop the dialog
		ngDialog.open(opts);
	}


	/**
	 * Test if the details are complete on the booking
	 */
	$scope.detailsComplete = function () {
		errors = [];
		validations = [];
		var complete = true;
		if (!$scope.bookingForm.salutation || $scope.bookingForm.salutation.length == 0) {
			complete = false;
			errors.push("Salutation");
			validations.push($scope.booking.salutation);
		}
		if (!$scope.bookingForm.name || $scope.bookingForm.name.length == 0) {
			complete = false;
			errors.push("Full name");
			validations.push($scope.booking.name);
		}
		if (!$scope.bookingForm.surname || $scope.bookingForm.surname.length == 0) {
			complete = false;
			errors.push("Surname");
			validations.push($scope.booking.surname);
		}
		if (!$scope.bookingForm.firstName || $scope.bookingForm.firstName.length == 0) {
			complete = false;
			errors.push("First name");
			validations.push($scope.booking.firstname);
		}
		if ($scope.event.addressReqd && (!$scope.bookingForm.address1 || $scope.bookingForm.address1.length == 0)) {
			complete = false;
			errors.push("Address line 1");
			validations.push($scope.booking.address1);
		}
		if ($scope.event.addressReqd && (!$scope.bookingForm.postcode || $scope.bookingForm.postcode.length == 0)) {
			complete = false;
			errors.push("Postcode");
			validations.push($scope.booking.postcode);
		}
		if ($scope.event.areaReqd && $scope.areas.length > 0 && (!$scope.bookingForm.area || $scope.bookingForm.area.length == 0)) {
			complete = false;
			errors.push("Area");
			validations.push($scope.booking.area);
		}
		if ($scope.event.menusOnOffer > 1) {
			if (!$scope.bookingForm.menuChoice) {
				complete = false;
				errors.push("Menu choice");
				validations.push($scope.booking.menuchoice);
			}
		}
		if (($scope.bookingForm.email && (!$scope.bookingForm.confirmemail || $scope.bookingForm.confirmemail.length == 0))
			|| ($scope.bookingForm.confirmemail && (!$scope.bookingForm.email || $scope.bookingForm.email.length == 0))
			|| ($scope.bookingForm.email && $scope.bookingForm.confirmemail && $scope.bookingForm.email != $scope.bookingForm.confirmemail)
		) {
			complete = false;
			errors.push("Enter matching email address twice or not at all");
			validations.push($scope.booking.email);
			validations.push($scope.booking.confirmemail);
		}
		if (!$scope.eventBookings && !$scope.userBookings) {
			if ($scope.lodgeMandatory && (!$scope.bookingForm.lodge || $scope.bookingForm.lodge.length == 0)) {
				complete = false;
				errors.push($scope.orderlabel);
				validations.push($scope.booking.lodge);
			}
			if ($scope.lodgeMandatory && (!$scope.bookingForm.lodgeNo || $scope.bookingForm.lodge == 0)) {
				complete = false;
				errors.push($scope.orderlabel + " number");
				validations.push($scope.booking.lodgeno);
			}
			if (!$scope.bookingForm.email || $scope.bookingForm.email.length == 0) {
				complete = false;
				errors.push("Email address");
				validations.push($scope.booking.email);
			}
			//if (!$scope.bookingForm.confirmemail || $scope.bookingForm.confirmemail.length==0) {
			//	complete=false;
			//	errors.push("Email confirmation ()")
			//}
		}
		if ($scope.bookingForm.places > 1) {
			if (!$scope.linkedbookings || $scope.linkedbookings.length == 0) {
				complete = false;
				errors.push("Additional attendee information")
			}
			else {
				var lbcount = ($scope.bookingForm.places - 1);
				$.each($scope.linkedbookings, function (index, value) {
					if (index < ($scope.bookingForm.places - 1)) {
						lbcount--;
						if (this.surname != "*placeholder*") {
							if (!this.salutation || this.salutation.length == 0) {
								complete = false;
								errors.push("Salutation for additional attendee " + (index + 1).toString())
							}
							if (!this.surname || this.surname.length == 0) {
								complete = false;
								errors.push("Surname for additional attendee " + (index + 1).toString())
							}
							if (!this.firstName || this.firstName.length == 0) {
								complete = false;
								errors.push("First name for additional attendee " + (index + 1).toString())
							}
							if ($scope.event.menusOnOffer > 1) {
								if (!this.menuChoice) {
									complete = false;
									errors.push("Menu choice for additional attendee " + (index + 1).toString());
								}
							}
						}
					}
				})
				if (lbcount > 0) {
					var m = $scope.linkedbookings.length;
					complete = false;
					while (lbcount--) {
						m++;
						errors.push("Salutation for additional attendee " + (m).toString());
						errors.push("Surname for additional attendee " + (m).toString());
						errors.push("First name for additional attendee " + (m).toString());
					}
				}
			}

		}

		if (!complete) {
			$scope.validationErrors(errors);
			angular.forEach(validations, function (field) {
				field.$setDirty();
				field.$setValidity("required", false);
			})
			$scope.bookingForm.loading = false;
		}

		return complete;
	}


	/**
	 * Validation errors
	 */
	$scope.validationErrors = function (errors) {
		// Prompt the user to highlight validation errors (missing mandatory fields)
		if (errors && errors.length > 0) {
			$scope.errors = errors;
			// Give the user the chance to pull out
			var opts = {
				template: "/templates/validationErrors.html",
				className: 'ngdialog-theme-default',
				scope: $scope
			};
			// Pop the dialog
			ngDialog.open(opts);

		}
	}

	/**
	 * Submit booking
	 */
	$scope.submitBookingForm = function () {

		$scope.bookingForm.loading = true;

		if ($scope.mode == "delete") {
			$scope.proceed();
		}
		else {
			// Remove items from the linkedBookings that are beyond the number of places
			if ($scope.bookingForm.places < 2) {
				$scope.linkedbookings = []
			}
			else {
				$scope.linkedbookings = $.grep($scope.linkedbookings, function (obj, n) {
					return (n <= ($scope.bookingForm.places - 2))
				})
			}

			// Validation checking
			if ($scope.detailsComplete()) {
				// If we have additional linked bookings, do a quick check that that are not
				// potentially double booked before proceeding
				if ($scope.bookingForm.places < 2) {
					$scope.proceed()
				}
				else {
					$http.post("/validateadditions", {
						_csrf: SAILS_LOCALS._csrf,
						eventId: $scope.event.id,
						linkedBookings: $scope.linkedbookings,
						bookingId: (SAILS_LOCALS.booking.id) ? SAILS_LOCALS.booking.id : null
					})
						.then(function onSuccess(sailsResponse) {
							if (typeof sailsResponse.data == "string" && sailsResponse.data.indexOf("<!-- HOMEPAGE -->") >= 0) {
								toastr.error("Your session has expired. Please log in again")
								setTimeout(function () {
									window.location = "/homepage";
								}, 1000);
								return;
							}
							if (sailsResponse.data.length == 0) {
								// No potential problems
								$scope.proceed()
							}
							else {
								$scope.duplicates = sailsResponse.data;
								var opts = {
									template: "/templates/bookingDialog.html",
									className: 'ngdialog-theme-default',
									scope: $scope
								};
								// Pop the dialog
								ngDialog.openConfirm(opts)
									.then(function (value) {
										// Continue with booking
										$scope.proceed()
									}, function (reason) {
										// They bottled it
										$scope.bookingForm.loading = false;
									});

							}
						})
						.catch(function onError(sailsResponse) {
							// Cannot do much here
						})
						.finally(function eitherWay() {
							// Nothing to do
						})
				}
			}
		}

	}


	/**
	 * Proceed with booking after successful checks
	 *
	 */
	// Private function to proceed with booking
	$scope.proceed = function () {

		if ($scope.mode == "delete") {
			// The only "mode" we care about is delete, since "create" is handled as a normal booking
			var cancelBooking = function () {
				$http.post('/updatebooking/' + $scope.mode, {
					_csrf: SAILS_LOCALS._csrf,
					bookingid: SAILS_LOCALS.booking.id
				})
					.then(function onSuccess(sailsResponse) {
						if ($scope.event.regInterest) {
							if ($scope.myBookings) {
								toastr.success("You have successfully cancelled your interest")
							}
							else {
								toastr.success("You have successfully cancelled the interest")
							}
						}
						else {
							if ($scope.myBookings) {
								toastr.success("You have successfully cancelled your booking")
							}
							else {
								toastr.success("You have successfully cancelled the booking")
							}
						}
						setTimeout(function () {
							if ($scope.myBookings)
								window.location = '/mybookings'
							else if ($scope.eventBookings)
								window.location = '/eventbookings?eventid=' + $scope.event.id;
							else if ($scope.userBookings)
								window.location = '/userbookings?userid=' + $scope.selectedUserId;
							else
								window.location = '/'
						}, 1000)
					})
					.catch(function onError(sailsResponse) {

						// Handle known error type(s).
						toastr.error(sailsResponse.data, 'Error');
						$scope.bookingForm.loading = false;

					})
					.finally(function eitherWay() {
						//$scope.bookingForm.loading = false;
					})
			}

			// If we are cancelling a paid up booking, seek confirmation
			if ($scope.bookingForm.paid) {
				var opts = {
					template: "/templates/bookingCancellationConfirmation.html",
					className: 'ngdialog-theme-default',
					scope: $scope
				};
				// Pop the dialog
				ngDialog.openConfirm(opts)
					.then(function (value) {
						// Continue with cancellation
						cancelBooking()
					}, function (reason) {
						// They bottled it
						$scope.bookingForm.loading = false;
					});
			}
			else {
				cancelBooking();
			}


		}
		else {

			var makeBooking = function(route) {

				// For MyBookings we need to confirm the email address
				if (!userBookingHimselfIn || !SAILS_LOCALS.verifyEmailAddressOnBooking) {
					postBooking(route);
				} else {
					var opts={
						template:"/templates/emailConfirmation.html",
						className: 'ngdialog-theme-default',
						scope: $scope
					};
					$scope.checkemail = $scope.bookingForm.email;
					// Pop the dialog
					ngDialog.openConfirm(opts)
					.then(function (value) {
						// Continue with booking
						if ($scope.checkemail.trim() !== $scope.bookingForm.email.trim()) {
							$scope.bookingForm.confirmEmail = $scope.bookingForm.email;
							$scope.user.email = $scope.bookingForm.email;
						}
						postBooking(route);
					}, function (reason) {
						// They bottled it
						$scope.bookingForm.loading = false;
					});
				}
			}


			/**
			 * Private function to make the booking
			 */
			var postBooking = function (route) {
				$http.post(route, {
					_csrf: SAILS_LOCALS._csrf,
					eventid: $scope.event.id,
					salutation: $scope.bookingForm.salutation,
					name: $scope.bookingForm.name,
					surname: $scope.bookingForm.surname,
					firstName: $scope.bookingForm.firstName,
					category: $scope.bookingForm.category,
					phone: $scope.bookingForm.phone,
					lodge: $scope.bookingForm.lodge,
					lodgeNo: $scope.bookingForm.lodgeNo,
					lodgeYear: $scope.bookingForm.lodgeYear,
					isVO: $scope.bookingForm.isVO,
					voLodge: $scope.bookingForm.voLodge,
					voLodgeNo: $scope.bookingForm.voLodgeNo,
					voCentre: $scope.bookingForm.voCentre,
					voArea: $scope.bookingForm.voArea,
					tableNo: $scope.bookingForm.tableNo,
					centre: $scope.bookingForm.centre,
					area: $scope.bookingForm.area,
					rank: $scope.bookingForm.rank,
					dietary: $scope.bookingForm.dietary,
					email: $scope.bookingForm.email,
					address1: $scope.bookingForm.address1,
					address2: $scope.bookingForm.address2,
					address3: $scope.bookingForm.address3,
					address4: $scope.bookingForm.address4,
					postcode: $scope.bookingForm.postcode,
					info: $scope.bookingForm.info,
					paid: $scope.bookingForm.paid,
					mop: $scope.bookingForm.mop,
					amountPaid: $scope.bookingForm.amountPaid,
					places: $scope.bookingForm.places,
					menuChoice: $scope.bookingForm.menuChoice || 1,
					linkedBookings: $scope.linkedbookings,
					bookingId: (SAILS_LOCALS.booking.id) ? SAILS_LOCALS.booking.id : null
				})
					.then(function onSuccess(sailsResponse) {
						//console.log(sailsResponse)
						$scope.booking = sailsResponse.data;
						if ($scope.event.regInterest) {
							if (SAILS_LOCALS.booking.id) {
								// An update rather than a new booking
								if ($scope.eventBookings || $scope.userBookings) {
									toastr.success("The interest has been updated successfully")
								}
								else {
									toastr.success("Your interest has been updated successfully")
								}
							}
							else {
								toastr.success("Interest registration was successful")
							}
						}
						else {
							if (SAILS_LOCALS.booking.id) {
								// An update rather than a new booking
								if ($scope.eventBookings || $scope.userBookings) {
									toastr.success("The booking has been updated successfully")
								}
								else {
									toastr.success("Your booking has been updated successfully")
								}
							}
							else {
								if ($scope.eventBookings || $scope.userBookings) {
									toastr.success("The booking was successful")
								}
								else {
									toastr.success("Your booking was successful")
								}
							}
						}
						// For my bookings or ordinary bookings we will issue a confirmation dialog,
						// otherwise we will return to where we came from
						if ($scope.eventBookings || $scope.userBookngs || SAILS_LOCALS.booking.id || $scope.selectedUserId) {
							$scope.finish();
						}
						else {
							// Now decide if we are taking online bookings or not
							if ($scope.booking.paymentSessionId) {
								var opts = {
									template: "/templates/checkoutConfirmation.html",
									className: 'ngdialog-theme-default',
									scope: $scope,
								};
								// Pop the dialog
								ngDialog.openConfirm(opts)
									.then(function (value) {
										// Continue to checkout
										var stripe = Stripe($scope.booking.stripePublishableKey);
										stripe
											.redirectToCheckout({
												sessionId: $scope.booking.paymentSessionId
											})
											.then(function (result) {
												if (result.error) {
													toastr.error(result.error.message, 'Error');
												}
											});
									}, function (reason) {
										// They bottled it
										$scope.mode = "delete";
										SAILS_LOCALS.booking.id = $scope.booking.id;
										$scope.proceed();
									});
							} else {
								$scope.event.paymentDetails = $scope.event.paymentDetails ?
																$scope.event.paymentDetails.replace(new RegExp('<%BOOKINGREF%>', 'g'), '*BOOKING REFERENCE WILL BE ON YOUR CONFIRMATION EMAIL*') :
																'';
								var opts = {
									template: "/templates/bookingConfirmation.html",
									className: 'ngdialog-theme-default',
									scope: $scope,
								};
								// Pop the dialog
								ngDialog.open(opts)
									.closePromise.then(function (value) {
										if ($scope.myBookings)
											window.location = '/mybookings'
										else
											window.location = '/'
									});

							}

						}

					})
					.catch(function onError(sailsResponse) {
						// Handle known error type(s).
						toastr.error(sailsResponse.data, 'Error');
						$scope.bookingForm.loading = false;
						//setTimeout(function(){
						//	if ($scope.myBookings)
						//		window.location='/mybookings'
						//	else if ($scope.eventBookings)
						//		window.location='/eventbookings?eventid='+$scope.event.id;
						//	else if ($scope.userBookings)
						//		window.location='/userbookings?userid='+$scope.selectedUserId;
						//	else
						//		window.location = '/'
						//},3000)
					})
					.finally(function eitherWay() {
						//$scope.bookingForm.loading = false;
					})
			}
			/*****************************************************************/

			// Normal booking creation/update
			var route = '/makebooking';
			if ($scope.mode == "create") {
				route += '/create';
				// Check that we are not booking in a user that is potentially already registered
				if (!$scope.selectedUserId) {

					var uriEncodeSimpleJson = function (json) {
						var out = {}
						angular.forEach(json, function (v, n) {
							out[n] = encodeURIComponent(v);
						})
						return out;
					}

					var sc = uriEncodeSimpleJson($scope.bookingForm);
					var searchClause = 'where={"or":[{';
					// First name, surname (and possibly lodge and lodge number) match
					searchClause += '"firstName":"' + sc.firstName + '"';
					searchClause += ',"surname":"' + sc.surname + '"';
					if ($scope.bookingForm.lodge && $scope.bookingForm.lodge.length > 0) {
						searchClause += ',"lodge":"' + sc.lodge + '"';
					}
					if ($scope.bookingForm.lodgeNo) {
						searchClause += ',"lodgeNo":' + sc.lodgeNo;
					}
					searchClause += "}"
					// OR the email address matches
					if ($scope.bookingForm.email && $scope.bookingForm.email.length > 0) {
						searchClause += ',{"email":"' + sc.email + '"}';
					}
					searchClause += ']}'

					$http.get("/user?_csrf=" + SAILS_LOCALS._csrf + "&" + searchClause)
						.then(function (sailsResponse) {
							// Session expired?
							if (typeof sailsResponse.data == "string" && sailsResponse.data.indexOf("<!-- HOMEPAGE -->") >= 0) {
								toastr.error("Your session has expired. Please log in again")
								setTimeout(function () {
									window.location = "/homepage";
								}, 1000);
								return;
							}
							if (sailsResponse.data.length === 1) {
								$scope.duplicateUser = sailsResponse.data[0];
								var opts = {
									template: "/templates/duplicateBookingUser.html",
									className: 'ngdialog-theme-default',
									scope: $scope
								};
								// Pop the dialog
								ngDialog.openConfirm(opts)
									.then(function (value) {
										// Continue with booking for the duplicate user we found
										if ($scope.event.addressReqd) {
											// If the user doesn't yet have any address information,
											// use the address info the booking address
											if (!$scope.duplicateUser.address1) {
												$scope.duplicateUser.address1 = $scope.bookingForm.address1;
												$scope.duplicateUser.address2 = $scope.bookingForm.address2;
												$scope.duplicateUser.address3 = $scope.bookingForm.address3;
												$scope.duplicateUser.address4 = $scope.bookingForm.address4;
												$scope.duplicateUser.postcode = $scope.bookingForm.postcode;
											}
										}
										angular.forEach($scope.duplicateUser, function (value, key) {
											$scope.bookingForm[key] = $scope.duplicateUser[key]
										})
										route += "?selecteduserid=" + $scope.duplicateUser.id;
										makeBooking(route);
									}, function (reason) {
										// They bottled it
										$scope.bookingForm.loading = false;
									});
							}
              else if (sailsResponse.data.length > 1) {
								$scope.duplicates = sailsResponse.data;
								var opts = {
									template: "/templates/duplicateBookingUsers.html",
									className: 'ngdialog-theme-default',
									scope: $scope
								};
								// Pop the dialog
								ngDialog.openConfirm(opts)
									.then(function () {
									}, function () {
										$scope.bookingForm.loading = false;
									});
							}
							else
								makeBooking(route);
						})
				}
				else {
					// Administrator making a booking for another user
					route += "?selecteduserid=" + $scope.selectedUserId;
					makeBooking(route);
				}
			}
			else {
				makeBooking(route);
			}

		}

	}

	$scope.transferBooking = function () {
		$scope.bookingForm.transferring = true;
		// Get a list of users that excludes this user
		$http.get('/user?_csrf=' + SAILS_LOCALS._csrf + '&where={"id":{"not":"' + encodeURIComponent($scope.selectedUserId.toString()) + '"}}&sort=surname&limit=10000')
			.then(function onSuccess(sailsResponse) {
				if (typeof sailsResponse.data == 'object') {
					$scope.users = sailsResponse.data;
					// Prompt the user to select a user to transfer
					// the bookings to
					var opts = {
						template: "/templates/bookingTransfer.html",
						className: 'ngdialog-theme-default',
						scope: $scope
					};
					// Pop the dialog
					ngDialog.openConfirm(opts)
						.then(function (value) {
							// Transfer bookings and try again
							$http.post('/booking/transfer', {
								_csrf: SAILS_LOCALS._csrf,
								id: $scope.selectedUserId,
								newuser: $scope.bookingForm.newuser,
								booking: SAILS_LOCALS.booking.id,
							})
								.then(function () {
									$scope.finish();
								})
								.catch(function (sailsResponse) {
									toastr.error(sailsResponse.data, 'Error');
									$scope.bookingForm.transferring = false;
								})
						},
							function (reason) {
								// Do nothing
								$scope.bookingForm.transferring = false;
							});
				}
				else {
					toastr.error(origResponse.data, 'Error');
				}
			})
			.catch(function onError(sailsResponse) {

				// Handle known error type(s).
				toastr.error(sailsResponse.data, 'Error');
				$scope.bookingForm.transferring = false;

			})
			.finally(function eitherWay() {
				// Nothing to do
			})
	}

	$scope.finish = function () {
		setTimeout(function () {
			$scope.bookingForm.transferring = false;
			if ($scope.myBookings)
				window.location = '/mybookings'
			else if ($scope.eventBookings)
				window.location = '/eventbookings?eventid=' + $scope.event.id;
			else if ($scope.userBookings)
				window.location = '/userbookings?userid=' + $scope.selectedUserId;
			else
				window.location = '/'
		}, 1000);
	}

}])
