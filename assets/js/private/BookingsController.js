angular.module('EventsModule').controller('BookingsController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		 
		$scope.bookingsLoading=true;
		 
		$scope.filterForm = {
			loading: false,
			paging: false,			
			criteria:SAILS_LOCALS.criteria,
			
		}
		
		$scope.myBookings 	= SAILS_LOCALS.myBookings;
		$scope.eventBookings= SAILS_LOCALS.eventBookings;
		$scope.userBookings= SAILS_LOCALS.userBookings;
		$scope.event 		= SAILS_LOCALS.event;
		$scope.selectedUser	= SAILS_LOCALS.selectedUser;
		$scope.allAddresses = "";
		$scope.event.bookInText=($scope.event.regInterest)?"register interest":"book in"; 
		
		// Get the bookings
		var route;
		if (SAILS_LOCALS.myBookings) {
			route='/allmybookings/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+'?mybookings=1'			
		}
		else if (SAILS_LOCALS.eventBookings) {
			route='/alleventbookings/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+'?eventid='+$scope.event.id;
		}	
		else if (SAILS_LOCALS.userBookings) {
			route='/alluserbookings/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+'?userid='+$scope.selectedUser.id;
		}	
		$scope.downloadUrl=route+'&download=1';
		$http.get(route)
			.success(function(data, status) {
				if (typeof data == 'object') {
					$scope.bookings = data;
					$scope.augment($scope.bookings,true);					
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
				$scope.bookingsLoading=false;
			})

		/**
		 * Augment data 
		 **/  
		$scope.augment=function(data,calcCapacity){
			// Calculate all addresses
			$scope.allAddresses = "";
			// Traverse the events and calculate an appropriate width
			// for each event name and accumulate email addresses
			angular.forEach(data,function(booking){
				// Calculate an appropriate width for the booking name
				if (booking.user) {
					booking.user.nameClass="user-name-100";
					if (booking.user.authProvider=="facebook" && booking.user.gravatarUrl && booking.user.gravatarUrl.indexOf("www.gravatar.com")<0) {
						booking.user.showPicture=true;
						booking.user.nameClass="user-name-70";                            
					}    
					if (booking.user.email) {
						$scope.allAddresses+=booking.user.email+";"		                      
					}
				}			
				if (calcCapacity) {
					$scope.event.capacity-=booking.places;
				}
			})				
		};
 

		/**
		 * Filter bookings
		 */  
		$scope.filterBookings = function(paging){
			if (paging) {
				$scope.filterForm.paging=true;
			}
			else {
				$scope.filterForm.loading=true;
			}
			$scope.bookingsLoading=true;
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
						$scope.bookings = sailsResponse.data;	
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
					$scope.bookingsLoading=false;
				})
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
		 * Called if the filter box changes
		 */
		$scope.filterChanged = function(){
			if (SAILS_LOCALS.myBookings) {
				$scope.downloadUrl='/allmybookings/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+'?mybookings=1&download=1'
			}
			else {
				$scope.downloadUrl='/alleventbookings/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+'?eventid='+$scope.event.id+'&download=1';
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