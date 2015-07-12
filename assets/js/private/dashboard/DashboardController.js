angular.module('PrivateModule').controller('DashboardController', ['$scope', '$http', '$location', 'toastr', function($scope, $http, $location, toastr) {
	
		// Initialise "me" in the scope with the data set in the view script 
		$scope.me=SAILS_LOCALS.me;
		// Store in sessionStorage also
		sessionStorage.setItem('me',JSON.stringify(SAILS_LOCALS.me)); 
		 
}]);