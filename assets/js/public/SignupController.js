angular.module('PublicModule').controller('SignupController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	$scope.signupForm = {
		loading: false
	}

	$scope.submitSignupForm = function(){
		$scope.signupForm.loading=true;
		// Submit request to Sails.
		$http.post('/signup', {
			name: $scope.signupForm.name,
			userName: $scope.signupForm.userName,
			lodge: $scope.signupForm.lodge,
			lodgeNo: $scope.signupForm.lodgeNo,
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
			
			var userNamelreadyInUse = sailsResponse.status == 410;

			if (userNameAlreadyInUse) {
				toastr.error('That user name has already been taken, please try again.', 'Error');
				return;
			}

		})
		.finally(function eitherWay(){
			$scope.signupForm.loading = false;
		})
	}

}])