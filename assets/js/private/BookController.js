angular.module('EventsModule').controller('BookController', ['$scope', '$http', 'toastr', 'ngDialog', function($scope, $http, toastr, ngDialog){

	
	$scope.bookingForm = {
		loading: false
	}

		
	// Initialise "user" in the scope with the data set in the view script 
	$scope.user=SAILS_LOCALS.user;
	$scope.event=SAILS_LOCALS.event;
	$scope.mode=SAILS_LOCALS.mode;
	$scope.selectedUserId=SAILS_LOCALS.selectedUserId; // Only populated when the administrator is making a booking on behalf of another user
	
	
	// Enable a repeater for additional attendees
	$scope.linkedbookings=[];
	$scope.linkedbookingsArr=[];
	
	// makeArray is called every time the number of places changes
	$scope.makeArray = function(){
		$scope.linkedbookingsArr.length=0;
		for (var i=0;i<(parseInt($scope.bookingForm.places)-1);i++) {
			$scope.linkedbookingsArr.push(i)
		} 
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
	$scope.mops=SAILS_LOCALS.mops;
	 
	
	// Do we have an existing booking to edit?
	$scope.existingBooking=false;
	$scope.deadline=SAILS_LOCALS.booking.deadline;
	$scope.myBookings=SAILS_LOCALS.myBookings;
	$scope.eventBookings=SAILS_LOCALS.eventBookings;
	$scope.placesMax=($scope.event.capacity>$scope.event.maxBookingPlaces)?$scope.event.maxBookingPlaces:$scope.event.capacity;
	$scope.placesMin=$scope.event.minBookingPlaces||1;
	if ($scope.placesMin>$scope.placesMax)
		$scope.placesMin=$scope.placesMax
	if ($scope.mode!="create") {
		if (SAILS_LOCALS.booking.id) {
			$scope.bookingForm = SAILS_LOCALS.booking.user;	
			// Is the administrator managing a booking for somebody else?
			if (SAILS_LOCALS.booking.user.id!=$scope.user.id) {
				$scope.userBookings=true;	
				$scope.selectedUserId=SAILS_LOCALS.booking.user.id;	
			}
		}
		else {
			$scope.bookingForm = $scope.user;							
		}		
		$scope.paidMsg="";
		// Convert lodge no to numeric
		if ($scope.bookingForm.lodgeNo)
		 	$scope.bookingForm.lodgeNo = parseInt($scope.bookingForm.lodgeNo); 
		// Initialise confirmation email
		$scope.bookingForm.confirmemail = $scope.bookingForm.email;		
	}	
	else {
		if ($scope.selectedUserId) {
			// Administrator is booking on behalf of another user
			$scope.userBookings=true;			
			$http.get("/user/"+	$scope.selectedUserId)
				.success(function(data,status){
					$scope.bookingForm=data;
					$scope.paidMsg="";
					// Convert lodge no to numeric
					$scope.bookingForm.lodgeNo = parseInt($scope.user.lodgeNo); 
					// Initialise confirmation email
					$scope.bookingForm.confirmemail = $scope.bookingForm.email;	                    
					$scope.bookingForm.places=$scope.placesMin;
					if ($scope.bookingForm.places>1)
						$scope.makeArray();			
				})
				.error(function(data, status, headers, config) {
					console.log("Error retrieving selected user for booking "+$scope.selectedUserId)
				});
		}
	}	

	// Open for bookings?
	var today=new Date();
	$scope.openForBookings=true;
	if (!$scope.eventBookings && !$scope.userBookings && $scope.event.openingDate && new Date($scope.event.openingDate)>today) {
		$scope.openForBookings=false;			
	}

	// Warn if not open for bookings
	$scope.bookingForm.bypassCode="";
    
    // Check whether or not the booking has been paid for
	$scope.chkPaid=function(){
        if(!$.scopeuser.isAdmin && !$scope.eventBookings && !$scope.userBookings && $scope.paid && $scope.mode!='delete') {
            var opts={
                template:"/templates/paidWarning.html",
                className: 'ngdialog-theme-default',
                scope: $scope	
			};
			 
			// Pop the dialog
			ngDialog.open(opts)
			 
        }
    }
    
    // Check whether or not we are actually open for bookings
	$scope.chkOpenForBookings=function(){
		if (!$scope.openForBookings && $scope.mode!="delete") {
			var opts={
				className: 'ngdialog-theme-default'			
			};
			var erOpts=$.extend({},opts);
			opts.template="/templates/notOpenForBookings.html";
			opts.scope=$scope;
			erOpts.template="/templates/bypassCodeInvalid.html";
			erOpts.scope=$scope;
			// Pop the dialog
			ngDialog.openConfirm(opts)
				.then(function (value) {
					// Attempting to bypass with a code
					var ok=false;
					$http.post("/verifybypasscode",{
                            _csrf: SAILS_LOCALS._csrf,
                            id:$scope.event.id,
                            bypassCode:$scope.bookingForm.bypassCode
                        })
						.success(function(data, status) {
							$scope.openForBookings=true;		
						}).
						error(function(data, status, headers, config) {
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
	$scope.chkOpenForBookings();
	
	// Salutations
	$scope.salutations=SAILS_LOCALS.salutations;
	
	
	// Display the payment details & blurb
	$scope.bookingForm.paymentDetails=$scope.event.paymentDetails;
	$scope.bookingForm.blurb=$scope.event.blurb;
	
	// Areas
	$scope.areas=SAILS_LOCALS.areas;
	
	if (!$scope.eventBookings && !$scope.userBookings && !$scope.myBookings)
		$scope.makingBooking=true;

	// If we are in "create" mode we should be safe to assume that there
	// will be no existing booking details
	if (SAILS_LOCALS.booking.id) {
		$scope.existingBooking=true;
		$scope.paid=SAILS_LOCALS.booking.paid;
		if ($scope.paid)
			$scope.paidMsg=" AND PAID"
		$scope.bookingForm.ref = SAILS_LOCALS.booking.ref;
		$scope.bookingForm.cost = SAILS_LOCALS.booking.cost;
		$scope.bookingForm.paid = SAILS_LOCALS.booking.paid;
		$scope.bookingForm.mop = SAILS_LOCALS.booking.mop;
		$scope.bookingForm.tableNo = SAILS_LOCALS.booking.tableNo;
		$scope.bookingForm.amountPaid = SAILS_LOCALS.booking.amountPaid;
		$scope.bookingForm.dietary = SAILS_LOCALS.booking.dietary;        
		$scope.bookingForm.info = SAILS_LOCALS.booking.info;
		$scope.bookingForm.places = SAILS_LOCALS.booking.places;
		$scope.bookingForm.remindersSent = SAILS_LOCALS.booking.remindersSent;
		$scope.makeArray();
		// Get linked booking info
		if (SAILS_LOCALS.booking.places>1) {
			$http.get("/linkedbooking/"+SAILS_LOCALS.booking.id).success(function(data, status) {
				if (typeof data == 'object') {
					$scope.linkedbookings=data;	 	
					$scope.linkedbookings.forEach(function(v,i){
						$scope.linkedbookings[i].lodgeNo=parseInt($scope.linkedbookings[i].lodgeNo)
					})		
				}				
			}).
			error(function(data, status, headers, config) {
		   		console.log("Error retrieving linked bookings for booking "+SAILS_LOCALS.booking.id)
		  	});
			
		}
        
        
        // Check if paid
        $scope.chkPaid();
	}
	else {
		if (!$scope.selectedUserId) {
			$scope.bookingForm.places=$scope.placesMin;
			if ($scope.bookingForm.places>1)
				$scope.makeArray();
		}		
	}


	// Warn if there are potential duplicates
	if (SAILS_LOCALS.potentialDuplicates && SAILS_LOCALS.potentialDuplicates.length>0) {
		$scope.potentialDuplicates=SAILS_LOCALS.potentialDuplicates;
		// Give the user the chance to pull out
		var opts={
			template:"/templates/potentialDuplicates.html",
			className: 'ngdialog-theme-default',
			scope: $scope
		};
		// Pop the dialog
		ngDialog.open(opts);
	}
	
	/**
	 * Test if the details are complete on the booking
	 */
	$scope.detailsComplete = function() {
		var complete=true;
		if (   (!$scope.bookingForm.name || $scope.bookingForm.name.length==0)
			//|| (!$scope.eventBookings && !$scope.userBookings && (!$scope.bookingForm.lodge || $scope.bookingForm.lodge.length==0))
			//|| (!$scope.eventBookings && !$scope.userBookings && (!$scope.bookingForm.lodgeNo || isNaN($scope.bookingForm.lodgeNo)))
			|| (!$scope.bookingForm.salutation || $scope.bookingForm.salutation.length==0)			
			|| (!$scope.eventBookings && !$scope.userBookings && (!$scope.bookingForm.email || $scope.bookingForm.email.length==0))			
            || ($scope.event.addressReqd && (!$scope.bookingForm.address1 || !$scope.bookingForm.postcode || $scope.bookingForm.address1.length==0 || $scope.bookingForm.postcode.length==0))			
			// Don't allow people to book themselves in if there is an opening date and we having got there yet!
			|| (!$scope.openForBookings)	
		
		) {
			complete=false;
		}
			
		return complete;
	}		
	
	/**
	 * Submit booking
	 */	
	$scope.submitBookingForm = function(){
		
		$scope.bookingForm.loading=true;
		
		if ($scope.mode=="delete") {
			$scope.proceed();
		}
		else {
			// Remove items from the linkedBookings that are beyond the number of places
			if ($scope.bookingForm.places<2) {
				$scope.linkedbookings=[]
			}
			else {
				$scope.linkedbookings=$.grep($scope.linkedbookings,function(obj,n){
					return (n<=($scope.bookingForm.places-2))
				})	
			}	
			
			
			
			// If we have additional linked bookings, do a quick check that that are not
			// potentially double booked before proceeding
			if ($scope.bookingForm.places<2) {
				$scope.proceed()
			}	
			else {
				$http.post("/validateadditions",{
                    _csrf: SAILS_LOCALS._csrf,
					eventId: $scope.event.id,	
					linkedBookings: $scope.linkedbookings,
					bookingId: (SAILS_LOCALS.booking.id)?SAILS_LOCALS.booking.id:null
				})
				.then(function onSuccess(sailsResponse){	
					if (typeof sailsResponse.data=="string" && sailsResponse.data.indexOf("<!-- HOMEPAGE -->")>=0) {
						toastr.error("Your session has expired. Please log in again")	
						setTimeout(function(){
							window.location="/homepage";
						},1000);
						return;
					}		 
					if (sailsResponse.data.length==0) {
						// No potential problems
						$scope.proceed()
					}
					else {
						$scope.duplicates=sailsResponse.data;
						// Give the user the chance to pull out
						var opts={
							template:"/templates/bookingDialog.html",
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
				.catch(function onError(sailsResponse){			 
					// Cannot do much here
				})
				.finally(function eitherWay(){
					// Nothing to do
				})
			}	
		}
		
	}
	
	/**
	 * Proceed with booking after successful checks
	 * 
	 */
	 // Private function to proceed with booking
	$scope.proceed=function(){
		
		if ($scope.mode=="delete") {
			// The only "mode" we care about is delete, since "create" is handled as a normal booking
			var cancelBooking=function(){
				$http.post('/updatebooking/'+$scope.mode, {
                    _csrf: SAILS_LOCALS._csrf,
					bookingid: SAILS_LOCALS.booking.id			 
				})
				.then(function onSuccess(sailsResponse){
					if ($scope.myBookings)
						toastr.success("You have successfully cancelled your booking")	
					else
						toastr.success("You have successfully cancelled the booking")	
					setTimeout(function(){
						if ($scope.myBookings)
							window.location='/mybookings'
						else if ($scope.eventBookings)
							window.location='/eventbookings?eventid='+$scope.event.id;
						else if ($scope.userBookings)
							window.location='/userbookings?userid='+$scope.selectedUserId;
						else
							window.location = '/'	
					},1000)				
				})
				.catch(function onError(sailsResponse){
		
					// Handle known error type(s).
					toastr.error(sailsResponse.data, 'Error');
					$scope.bookingForm.loading = false;
		
				})
				.finally(function eitherWay(){
					//$scope.bookingForm.loading = false;
				})
			}
			
			// If we are cancelling a paid up booking, seek confirmation
			if ($scope.bookingForm.paid) {
				var opts={
					template:"/templates/bookingCancellationConfirmation.html",
				 	className: 'ngdialog-theme-default',
					scope: $scope
				};
				// Pop the dialog
				ngDialog.openConfirm(opts)
					.then(function (value) {
						// Continue with booking
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
						
			/**
			 * Private function to make the booking
			 */	
			var makeBooking=function(route){
				$http.post(route, {
                    _csrf: SAILS_LOCALS._csrf,
					eventid: $scope.event.id,	
					salutation: $scope.bookingForm.salutation,
					name: $scope.bookingForm.name,
					surname: $scope.bookingForm.surname,
					firstName: $scope.bookingForm.firstName,
					phone: $scope.bookingForm.phone,
					lodge: $scope.bookingForm.lodge,
					lodgeNo: $scope.bookingForm.lodgeNo,
					tableNo: $scope.bookingForm.tableNo,
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
					linkedBookings: $scope.linkedbookings,
					bookingId: (SAILS_LOCALS.booking.id)?SAILS_LOCALS.booking.id:null
				})
				.then(function onSuccess(sailsResponse){	
					//console.log(sailsResponse)
					$scope.booking=sailsResponse.data;
					if (SAILS_LOCALS.booking.id)	{
						// An update rather than a new booking
						if ($scope.eventBookings || $scope.userBookings)
							toastr.success("The booking has been updated successfully")								
						else
							toastr.success("Your booking has been updated successfully")
					}
					else {
						if ($scope.eventBookings || $scope.userBookings)
							toastr.success("The booking was successful")							
						else
							toastr.success("Your booking was successful")
					}
					// For my bookings or ordinary bookings we will issue a confirmation dialog, 
					// otherwise we will return to where we came from
					if ($scope.eventBookings || $scope.userBookngs || SAILS_LOCALS.booking.id || $scope.selectedUserId) {
						setTimeout(function(){
							if ($scope.myBookings)
								window.location='/mybookings'
							else if ($scope.eventBookings)
								window.location='/eventbookings?eventid='+$scope.event.id;
							else if ($scope.userBookings)
								window.location='/userbookings?userid='+$scope.selectedUserId;
							else
								window.location = '/'
						},1000);	
					}	
					else {
						var opts={
							template:"/templates/bookingConfirmation.html",
							className: 'ngdialog-theme-default',
							scope: $scope,
						};
						// Pop the dialog
						ngDialog.open(opts)
							.closePromise.then(function (value) {								 
								if ($scope.myBookings)
									window.location='/mybookings'
								else
									window.location = '/'								
							});
												
					}
					
				})
				.catch(function onError(sailsResponse){			 
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
				.finally(function eitherWay(){
					//$scope.bookingForm.loading = false;
				})
			}
			/*****************************************************************/
			
			// Normal booking creation/update	
			var route='/makebooking';
			if ($scope.mode=="create") {
				route+='/create';
				// Check that we are not booking in a user that is potentially already registered
				if (!$scope.selectedUserId) {
                    
                    var uriEncodeSimpleJson=function(json) {
                        var out={}
                        angular.forEach(json,function(v,n){
                            out[n]=encodeURIComponent(v);
                        })
                        return out;
                    }  
					
                    var sc=uriEncodeSimpleJson($scope.bookingForm);
					var searchClause='where={"or":[{';
					// First name, surname (and possibly lodge and lodge number) match
					searchClause+='"firstName":"'+sc.firstName+'"';
					searchClause+=',"surname":"'+sc.surname+'"';
					if ($scope.bookingForm.lodge && $scope.bookingForm.lodge.length>0) {
						searchClause+=',"lodge":"'+sc.lodge+'"';
					}
					if ($scope.bookingForm.lodgeNo && $scope.bookingForm.lodgeNo.length>0) {
						searchClause+=',"lodgeNo":'+sc.lodgeNo;
					}
					searchClause+="}"
					// OR the email address matches
					if ($scope.bookingForm.email && $scope.bookingForm.email.length>0) {
						searchClause+=',{"email":"'+sc.email+'"}';
					}
					searchClause+=']}'
				 
					$http.get("/user?_csrf="+SAILS_LOCALS._csrf+"&"+searchClause)
					.then(function(sailsResponse){
						// Session expired?
						if (typeof sailsResponse.data=="string" && sailsResponse.data.indexOf("<!-- HOMEPAGE -->")>=0) {
							toastr.error("Your session has expired. Please log in again")	
							setTimeout(function(){
								window.location="/homepage";
							},1000);
							return;
						}
						if (sailsResponse.data.length>0) {
							$scope.duplicateUser=sailsResponse.data[0];
							var opts={
								template:"/templates/duplicateBookingUser.html",
							 	className: 'ngdialog-theme-default',
								scope: $scope
							};
							// Pop the dialog
							ngDialog.openConfirm(opts)
								.then(function (value) {
									// Continue with booking for the duplicate user we found
									angular.forEach($scope.duplicateUser,function(value,key){
										$scope.bookingForm[key]=$scope.duplicateUser[key]	
									})	
                                    route+="?selecteduserid="+$scope.duplicateUser.id; 								
									makeBooking(route);
				                }, function (reason) {
									// They bottled it
				                    $scope.bookingForm.loading = false;
				                });	
						}
						else 
							makeBooking(route);
					})	
				}
				else {
					// Administrator making a booking for another user
					route+="?selecteduserid="+$scope.selectedUserId; 
					makeBooking(route);
				}
			}
			else {
				makeBooking(route);
			}			 
			
		}				
		
	}

}])