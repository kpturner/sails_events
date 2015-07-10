angular.module('PrivateModule').controller('ProfileController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	$scope.profileForm = {
		loading: false
	}

	$http.get('/getprofile').success(function(data, status) {
		if (typeof data == 'object') {
			$scope.profileForm = data; 
			// Tweak the lodge no
			$scope.profileForm.lodgeno=parseInt($scope.profileForm.lodgeno);   
			// Set the confirm email
			$scope.profileForm.confirmemail=$scope.profileForm.email;   		
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
	
	$scope.submitProfileForm = function(){
		$scope.profileForm.loading=true;
		// Submit request to Sails.
		$http.post('/updateprofile', {
			name: $scope.profileForm.name,
			lodge: $scope.profileForm.lodge,
			lodgeno: $scope.profileForm.lodgeno,
			rank: $scope.profileForm.rank,
			dietary: $scope.profileForm.dietary,
			email: $scope.profileForm.email,
			password: $scope.profileForm.password
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
			$scope.profileForm.loading = false;
		})
	}

}])