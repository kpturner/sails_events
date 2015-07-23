angular.module('PrivateModule').controller('EventsController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;

		// Get the events
		$http.get('/allevents/').success(function(data, status) {
			if (typeof data == 'object') {
				$scope.events = data;					
			}
			else {
				window.location = '/';
			}
		}).
		error(function(data, status, headers, config) {
	   		// called asynchronously if an error occurs
	    	// or server returns response with an error status.
			window.location = '/';
	  	});
		  
		/**
		 * Filter events
		 */  
		$scope.filterEvents = function() {
			$http.get('/allevents/{{$scope.filter}}').success(function(data, status) {
			if (typeof data == 'object') {
				$scope.events = data;					
			}
			}).
			error(function(data, status, headers, config) {
		   		
		  	});
		}  

		/**
		 * Navigate to editor
		 */
		$scope.navigate = function(action,eventId) {
			$document.location("/event/"+action+"?eventid="+eventId)
		}

}])