angular.module('PrivateModule').controller('DashboardController', ['$scope', '$http', '$location', 'toastr', function($scope, $http, $location, toastr) {
	
		// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;

		// Get the events
		$http.get('/openevents').success(function(data, status) {
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
		
						
}]);