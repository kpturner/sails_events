angular.module('EventsModule').controller('SignupController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	$scope.signupForm = {
		loading: false
	}

	$scope.submitSignupForm = function(){
		$scope.signupForm.loading=true;
		// Submit request to Sails.
		$http.post('/auth/local/register', {
			user: $scope.signupForm
			//name: $scope.signupForm.name,
			//username: $scope.signupForm.username,
			//lodge: $scope.signupForm.lodge,
			//lodgeNo: $scope.signupForm.lodgeNo,
			//rank: $scope.signupForm.rank,
			//dietary: $scope.signupForm.dietary,
			//isVO: $scope.signupForm.isVO,
			//voLodge: $scope.signupForm.voLodge,
			//voLodgeNo: $scope.signupForm.voLodgeNo,
			//email: $scope.signupForm.email,
			//password: $scope.signupForm.password,
			//surname: $scope.signupForm.surname,
			//firstName: $scope.signupForm.firstName,
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