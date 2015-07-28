angular.module('EventsModule').controller('BookingsController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		 
		$scope.filterForm = {
			loading: false,
			filter:	SAILS_LOCALS.filter,
			
		}
		
		$scope.myBookings = SAILS_LOCALS.myBookings

		// Get the bookings
		var route='/allbookings/'+$scope.filterForm.filter;
		if (SAILS_LOCALS.myBookings)
			route+='?mybookings=1'
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
			var route='/allbookings/'+$scope.filterForm.filter;	
			if (SAILS_LOCALS.myBookings)
				route+='?mybookings=1'
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