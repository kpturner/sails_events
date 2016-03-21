angular.module('EventsModule').controller('UserBookingsController', ['$scope', '$http', '$location', 'toastr', function($scope, $http, $location, toastr) {
	
		// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		$scope.selectedUser=SAILS_LOCALS.selectedUser;
		$scope.userBookings=true;
		$scope.bookingsLoading=true;

		// Get the events
		$http.get('/openevents?selecteduserid='+$scope.selectedUser.id).success(function(data, status) {
			if (typeof data == 'object') {
				$scope.events = data;
				$scope.events.forEach(function(event,i){
					event.selectedUserId=$scope.selectedUser.id
					event.userBookings=true;
                    // Calculate an appropriate width for the event name
                    event.nameClass="event-name-100";
                    if (event.logoRight) {
                        if (event.logo) {
                            event.nameClass="event-name-60";
                        }
                        else {
                            event.nameClass="event-name-80";
                        }
                    }   
                    else {
                        if (event.logo) {
                            event.nameClass="event-name-80";
                        }
                    } 		
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
	  	})
		.finally(function(){
			$scope.bookingsLoading=false;	
		});
		
								
}]);