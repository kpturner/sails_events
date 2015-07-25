angular.module('EventsModule').controller('UserDetailsController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	$scope.user=SAILS_LOCALS.user;
	$scope.mode=SAILS_LOCALS.mode;
	$scope.userForm = {
		loading: false
	}

	$scope.userForm=SAILS_LOCALS.userDetails;
	
	// Convert lodge no to numeric
	$scope.userForm.lodgeNo = parseInt($scope.userForm.lodgeNo); 
	$scope.userForm.voLodgeNo = parseInt($scope.userForm.voLodgeNo); 
	// Set the confirm email
	$scope.userForm.confirmemail=$scope.userForm.email; 
	
	// Get a list of users in name order
	$http.get("/organisers")
		.then(function onSuccess(sailsResponse){
			$scope.organisers=sailsResponse.data;			
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			toastr.error(sailsResponse.data, 'Error');

		})
		
    
	
	/**
	 * Test if the details are complete on the user
	 */
	$scope.detailsComplete = function() {
		var complete=true;
		 
			
		return complete;
	}		
	
	$scope.submitUserForm = function(){
		$scope.userForm.loading=true;
						
		// Submit request to Sails.
		$http.post('/updateuser/'+$scope.mode, {
			data: $scope.userForm			 
		})
		.then(function onSuccess(sailsResponse){
			window.location = '/users';
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			toastr.error(sailsResponse.data, 'Error');

		})
		.finally(function eitherWay(){
			$scope.userForm.loading = false;
		})
	}

}])