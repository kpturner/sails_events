angular.module('PrivateModule').controller('ProfileController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	
	$scope.profileForm = {
		loading: false
	}

		
	// Initialise "user" in the scope with the data set in the view script 
	$scope.user=SAILS_LOCALS.user;
	$scope.profileForm = $scope.user;
	
	// Convert lodge no to numeric
	$scope.profileForm.lodgeNo = parseInt($scope.user.lodgeNo); 
	// Set the confirm email
	$scope.profileForm.confirmemail=$scope.profileForm.email; 
	  
	
	/**
	 * Test if the details are complete on the profile
	 */
	$scope.detailsComplete = function() {
		var complete=true;
		if (   (!$scope.profileForm.name || $scope.profileForm.name.length==0)
			|| (!$scope.profileForm.lodge || $scope.profileForm.lodge.length==0)
			|| (!$scope.profileForm.lodgeNo || isNaN($scope.profileForm.lodgeNo))
			|| (!$scope.profileForm.email || $scope.profileForm.email.length==0)
			|| (($scope.user.authProvider=="local")
					&& (   (!$scope.profileForm.username || $scope.profileForm.username.length==0)
						|| (!$scope.profileForm.password ||$scope.profileForm.password.length==0)
						)
				)
		) {
			complete=false;
		}
			
		return complete;
	}		
	
	$scope.submitProfileForm = function(){
		$scope.profileForm.loading=true;
		// Submit request to Sails.
		$http.post('/updateprofile', {
			name: $scope.profileForm.name,
			username: $scope.profileForm.username,
			lodge: $scope.profileForm.lodge,
			lodgeNo: $scope.profileForm.lodgeNo,
			rank: $scope.profileForm.rank,
			dietary: $scope.profileForm.dietary,
			email: $scope.profileForm.email,
			isAdmin: $scope.profileForm.isAdmin,
			password: $scope.profileForm.password
		})
		.then(function onSuccess(sailsResponse){
			window.location = '/';
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			toastr.error(sailsResponse.data, 'Error');

		})
		.finally(function eitherWay(){
			$scope.profileForm.loading = false;
		})
	}

}])