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
			route='/allmybookings/'+encodeURIComponent($scope.filterForm.filter)+'?mybookings=1'			
		}
		else {
			route='/alleventbookings/'+encodeURIComponent($scope.filterForm.filter)+'?eventid='+$scope.event.id;
		}	
		$scope.downloadUrl=route+'&download=1';
		$http.get(route)
			.success(function(data, status) {
				if (typeof data == 'object') {
					$scope.bookings = data;
					// Calculate capacity 
					$scope.bookings.forEach(function(b,i){
						$scope.event.capacity-=b.places;
					})
					 				
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
				route='/allmybookings/'+encodeURIComponent($scope.filterForm.filter)+'?mybookings=1'
			}
			else {
				route='/alleventbookings/'+encodeURIComponent($scope.filterForm.filter)+'?eventid='+$scope.event.id;
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
		 * Create new booking
		 * @param {Integer} eventId 
		 */
		$scope.createNewBooking = function(eventId) {
			$scope.newBooking=true;
			var eventId=(eventId)?eventId:$scope.event.id;
			window.location="/booking/create/?eventid="+eventId+'&eventbookings=true';
		}
		
		/**
		 * Called if the filter box changes
		 */
		$scope.filterChanged = function(){
			if (SAILS_LOCALS.myBookings) {
				$scope.downloadUrl='/allmybookings/'+encodeURIComponent($scope.filterForm.filter)+'?mybookings=1&download=1'
			}
			else {
				$scope.downloadUrl='/alleventbookings/'+encodeURIComponent($scope.filterForm.filter)+'?eventid='+$scope.event.id+'&download=1';
			}	
		}
		
		/**
		 * Download bookings
		 */  
		$scope.downloadBookings = function(){
			$scope.downloading=true;
			// Submit request to Sails.
			var route;
			if (SAILS_LOCALS.myBookings) {
				route='/allmybookings/'+encodeURIComponent($scope.filterForm.filter)+'?mybookings=1&download=1'
			}
			else {
				route='/alleventbookings/'+encodeURIComponent($scope.filterForm.filter)+'?eventid='+$scope.event.id+'&download=1';
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
					$scope.downloading = false;
				})
		}

		 

}])