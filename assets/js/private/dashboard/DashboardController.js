angular.module('PrivateModule').controller('DashboardController', ['$scope', '$http', '$location', 'toastr', function($scope, $http, $location, toastr) {
	
		// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		
		
}]);