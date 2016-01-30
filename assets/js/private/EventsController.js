angular.module('EventsModule').controller('EventsController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;

		$scope.filterForm = {
			loading: false,
			filter:SAILS_LOCALS.filter
		}

		
		// Get the events
		$http.get('/allevents/'+$scope.filterForm.filter)
			.success(function(data, status) {
				if (typeof data == 'object') {
					$scope.events = data;
                    // Traverse the events and calculate an appropriate width
                    // for each event name
                    angular.forEach($scope.events,function(event){
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
		  	}
		);
		  
		/**
		 * Filter events
		 */  
		//$scope.filterEvents = function() {
		//	$http.get('/allevents/'+$scope.filterForm.filter).success(function(data, status) {
		//	if (typeof data == 'object') {
		//		$scope.events = data;					
		//	}
		//	}).
		//	error(function(data, status, headers, config) {
		//   		
		//  	});
		//}  

		$scope.filterEvents = function(){
			$scope.filterForm.loading=true;
			// Submit request to Sails.
			$http.get('/allevents/'+encodeURIComponent($scope.filterForm.filter))
				.then(function onSuccess(sailsResponse){
					if (typeof sailsResponse.data == 'object') {
						$scope.events = sailsResponse.data;					
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
		$scope.navigate = function(action,eventId) {
			$document.location("/event/"+action+"?eventid="+eventId)
		}

}])