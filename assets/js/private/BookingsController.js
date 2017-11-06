angular.module('EventsModule').controller('BookingsController', ['scroller','$scope', '$http', 'toastr', function(scroller,$scope, $http, toastr){

	// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		 
		$scope.hideCapacity=false;
		$scope.newBooking=false;
		$scope.addingPD=false;
		// Calculate all addresses
		$scope.allAddresses = "";
				 
		$scope.filterForm = {
			loading: false,
			paging: false,			
			criteria:SAILS_LOCALS.criteria,			
		}
		$scope.initialLimit=SAILS_LOCALS.criteria.limit;
		$scope.initialPage=SAILS_LOCALS.criteria.page;
		$scope.scrollPage=1;		
		$scope.scrollDisabled=$scope.filterForm.criteria.sortByName;

		// If paging is not visible (i.e. the user cannot do it manually because of screen size)
		// make sure that page is set to 1 regardless of what was stored in the session. This 
		// means that if the user has partially scrolled with dynamic update and then clicks
		// on this screen again they go back to the beginning
		if (!$("#page").is(":visible")) {
			$scope.filterForm.criteria.page=1;
		}

		
		$scope.myBookings 	= SAILS_LOCALS.myBookings;
		$scope.eventBookings= SAILS_LOCALS.eventBookings;
		$scope.userBookings	= SAILS_LOCALS.userBookings;
		$scope.event 		= SAILS_LOCALS.event;
		$scope.bookingCardHeight = SAILS_LOCALS.bookingCardHeight;
		$scope.selectedUser	= SAILS_LOCALS.selectedUser;
		$scope.viewOnly		=SAILS_LOCALS.viewOnly;
		// If not view only then make it so anyway if the user is not an admin or the organiser
		if (!$scope.viewOnly && $scope.eventBookings) {
			$scope.viewOnly=!$scope.user.isAdmin;
			if ($scope.viewOnly) {
				if (($scope.event.organiser && $scope.user.email==$scope.event.organiser.email) || ($scope.event.organiser2 && $scope.user.email==$scope.event.organiser2.email)) {
					$scope.viewOnly=false
				}
			}			
		}
		$scope.permanentDiningList=SAILS_LOCALS.permanentDiningList;
		$scope.allAddresses = "";
		$scope.event.bookInText=($scope.event.regInterest)?"register interest":"book in"; 
		
		// Get the bookings
		if (SAILS_LOCALS.myBookings) {
			$scope.urn='/allmybookings/';
			$scope.queryString='mybookings=1';			
		}
		else if (SAILS_LOCALS.eventBookings) {
			$scope.urn='/alleventbookings/'
			$scope.queryString='eventid='+$scope.event.id;
		}	
		else if (SAILS_LOCALS.userBookings) {
			$scope.urn='/alluserbookings/'
			$scope.queryString='userid='+$scope.selectedUser.id;
		}
		var uri=$scope.urn+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+'?'+$scope.queryString;
		// Let's trap the scroll to bottom on the body and
		// increment the page when they get there (it will load more data if need be)		
		var scrollHandler=$.proxy(scroller.scroll,{
				scope: 	$scope,
				dataProperty: "bookings",				
				urn: 	$scope.urn,
				queryString: $scope.queryString,
				augmentationFunction: "augment"
			})
		$(window).scroll(scrollHandler); 
		$scope.loading=true;
		$scope.downloadUrl=uri+'&download=1';		
		$http.get(uri)
			.success(function(data, status) {
				$scope.hideCapacity=false;
				if (typeof data == 'object') {
					if (data.bookings) {
						$scope.bookings = data.bookings;
						$scope.hideCapacity=(data.capacity==null || data.capacity==undefined);	
						$scope.capacity=data.capacity;
					}
					else {
						$scope.bookings = data;
						$scope.hideCapacity=true;	
					}									
					$scope.augment($scope.bookings);					
				}
				else {
					window.location = '/';
				}				
			})
			.error(function(data, status, headers, config) {
		   		// called asynchronously if an error occurs
		    	// or server returns response with an error status.
				window.location = '/';
		  	})
			.finally(function(){
				$scope.loading=false;
			})

		/**
		 * Augment data 
		 **/  
		$scope.augment=function(data){			
			// Traverse the events and calculate an appropriate width
			// for each event name and accumulate email addresses
			angular.forEach(data,function(booking){
				// Calculate an appropriate width for the booking name
				if (booking.user) {
					booking.user.nameClass="user-name-100";
					if (booking.user.gravatarUrl && booking.user.gravatarUrl.indexOf("www.gravatar.com")<0) {
						booking.user.showPicture=true;
						booking.user.nameClass="user-name-65";                            
					}    
					if (booking.user.email) {
						$scope.allAddresses+=booking.user.email+";"		                      
					}
				}
			})				
		};
 

		/**
		 * Filter bookings
		 */  
		$scope.filterBookings = function(paging){
			$scope.loading=true;
			scroller.filter($scope,"bookings",$scope.urn,$scope.queryString,"augment",paging,false,function(sailsResponse){				
				$scope.loading=false;
				$scope.hideCapacity=false;	
				if (sailsResponse.data.bookings) {
					$scope.hideCapacity=(sailsResponse.data.capacity==null || sailsResponse.data.capacity==undefined);	
					$scope.capacity=sailsResponse.data.capacity;
				}
				else {
					$scope.hideCapacity=true;	
				}				
			});
			/*
			if (paging) {
				$scope.filterForm.paging=true;
			}
			else {
				$scope.filterForm.loading=true;
			}
			$scope.loading=true;
			// Submit request to Sails.
			var route;
			if (SAILS_LOCALS.myBookings) {
				route='/allmybookings/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+'?mybookings=1'
			}
			else if (SAILS_LOCALS.eventBookings){
				route='/alleventbookings/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+'?eventid='+$scope.event.id;
			}	
			else if (SAILS_LOCALS.userBookings) {
				route='/alluserbookings/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+'?userid='+$scope.selectedUser.id;
			}	
			$http.get(route)
				.then(function onSuccess(sailsResponse){
					if (typeof sailsResponse.data == 'object') {
						if (sailsResponse.data.bookings) {
							$scope.bookings = sailsResponse.data.bookings;
							$scope.hideCapacity=!sailsResponse.data.capacity;	
							$scope.capacity=sailsResponse.data.capacity;
						}
						else {
							$scope.bookings = sailsResponse.data;
							$scope.hideCapacity=true;	
						}																	
						$scope.augment($scope.bookings);									
					}
					else {
						window.location="/";
					}
				})
				.catch(function onError(sailsResponse){
		
					// Handle known error type(s).
					toastr.error(sailsResponse.data, 'Error');
					
		
				})
				.finally(function eitherWay(){
					$scope.filterForm.loading = false;
					$scope.filterForm.paging = false;
					$scope.loading=false;
				})
			*/
		}
		
		
		/**
		 * Create new booking
		 * @param {Integer} eventId 
		 */
		$scope.createNewBooking = function(eventId) {
			$scope.newBooking=true;
			if ($scope.userBookings) {
				window.location="/booking/create/?userid="+$scope.selectedUser.id+'&userbookings=true';	
			}
			else {
				var eventId=(eventId)?eventId:$scope.event.id;
				window.location="/booking/create/?eventid="+eventId+'&eventbookings=true';	
			}			
		}

		/**
		 * Add permanent diners
		 */
		$scope.addPD = function(eventId) {
			$scope.addingPD=true;
			$http.post("/addpd/"+$scope.event.id,{
					_csrf: SAILS_LOCALS._csrf
				})
				.then(function onSuccess(sailsResponse){
					$scope.filterBookings();					
				})
				.catch(function onError(sailsResponse){
		
					// Handle known error type(s).
					toastr.error(sailsResponse.data, 'Error');
					
		
				})
				.finally(function eitherWay(){
					$scope.addingPD=false;
				})			 			
		}
		
		/**
		 * Called if the filter box changes
		 */
		$scope.filterChanged = function(){
			if (SAILS_LOCALS.myBookings) {
				$scope.downloadUrl='/allmybookings/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+'?mybookings=1&download=1'
			}
			else {
				$scope.downloadUrl='/alleventbookings/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+'?eventid='+$scope.event.id+'&download=1';
			}	
			// If "sort by name" disable scroller
			if ($scope.filterForm.criteria.sortByName) {
				$scope.scrollDisabled=true;
			}
			else {
				$scope.scrollDisabled=false;
			}
		}
		
		/**
		 * Download bookings
		 */  
		$scope.downloadBookings = function(){
		
			window.location=$scope.downloadUrl;
		
		}	
		/**
		 * Download lodge room
		 */  
		$scope.downloadLodgeRoom = function(){
		
			window.location='/lodgeroom?eventid='+$scope.event.id;
		
		}	
		 
}])