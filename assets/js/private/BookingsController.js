angular.module('EventsModule').controller('BookingsController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		 
		$scope.filterForm = {
			loading: false,
			filter:	SAILS_LOCALS.filter,
			
		}
		
		$scope.myBookings 	= SAILS_LOCALS.myBookings;
		$scope.eventBookings= SAILS_LOCALS.eventBookings;
		$scope.event 		= SAILS_LOCALS.event;

		// Get the bookings
		var route;
		if (SAILS_LOCALS.myBookings) {
			route='/allmybookings/'+$scope.filterForm.filter+'?mybookings=1'
		}
		else {
			route='/alleventbookings/'+$scope.filterForm.filter+'?eventid='+$scope.event.id;
		}	
		$http.get(route)
			.success(function(data, status) {
				if (typeof data == 'object') {
					$scope.bookings = data;					
				}
				else {
					window.location = '/';
				}
			}).
			error(function(data, status, headers, config) {
		   		// called asynchronously if an error occurs
		    	// or server returns response with an error status.
				window.location = '/';
		  	}
		);
		  
		/**
		 * Filter bookings
		 */  
		$scope.filterBookings = function(){
			$scope.filterForm.loading=true;
			// Submit request to Sails.
			var route;
			if (SAILS_LOCALS.myBookings) {
				route='/allmybookings/'+$scope.filterForm.filter+'?mybookings=1'
			}
			else {
				route='/alleventbookings/'+$scope.filterForm.filter+'?eventid='+$scope.event.id;
			}	
			$http.get(route)
				.then(function onSuccess(sailsResponse){
					if (typeof sailsResponse.data == 'object') {
						$scope.bookings = sailsResponse.data;					
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
				})
		}

		/**
		 * Navigate to editor
		 */
		$scope.navigate = function(action,bookingId) {
			$document.location("/booking/"+action+"?bookingid="+bookingId)
		}

}])