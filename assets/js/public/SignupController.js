angular.module('PublicModule').controller('SignupController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	$scope.signupForm = {
		loading: false
	}

	$scope.submitSignupForm = function(){
		$scope.signupForm.loading=true;
		// Submit request to Sails.
		$http.post('/auth/local/register', {
			name: $scope.signupForm.name,
			username: $scope.signupForm.username,
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
			toastr.error(sailsResponse.data, 'Error');

		})
		.finally(function eitherWay(){
			$scope.signupForm.loading = false;
		})
	}

}])