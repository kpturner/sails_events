angular.module('EventsModule').controller('SignupController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	$scope.signupForm = {
		loading: false
	}

	$scope.submitSignupForm = function(){
		$scope.signupForm.loading=true;
		// Submit request to Sails.
		$http.post('/signup', {
			name: $scope.signupForm.name,
			lodge: $scope.signupForm.lodge,
			lodgeno: $scope.signupForm.lodgeno,
			rank: $scope.signupForm.rank,
			dietary: $scope.signupForm.dietary,
			email: $scope.signupForm.email,
			password: $scope.signupForm.password
		})
		.then(function onSuccess(sailsResponse){
			window.location = '/';
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			// If using sails-disk adaptor -- Handle Duplicate Key
			var emailAddressAlreadyInUse = sailsResponse.status == 409;

			if (emailAddressAlreadyInUse) {
				toastr.error('That email address has already been taken, please try again.', 'Error');
				return;
			}

		})
		.finally(function eitherWay(){
			$scope.signupForm.loading = false;
		})
	}

}])