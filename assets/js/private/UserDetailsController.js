angular.module('EventsModule').controller('UserDetailsController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	$scope.user=SAILS_LOCALS.user;
	$scope.mode=SAILS_LOCALS.mode;
	$scope.userdetailsForm = {
		loading: false
	}

	$scope.userdetailsForm=SAILS_LOCALS.userDetails;
	
	// Convert lodge no to numeric
	$scope.userdetailsForm.lodgeNo = parseInt($scope.userdetailsForm.lodgeNo); 
	$scope.userdetailsForm.voLodgeNo = parseInt($scope.userdetailsForm.voLodgeNo); 
	// Set the confirm email
	$scope.userdetailsForm.confirmemail=$scope.userdetailsForm.email; 
	
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
		$scope.userdetailsForm.loading=true;
						
		// Submit request to Sails.
		$http.post('/updateuser/'+$scope.mode, {
			data: $scope.userdetailsForm			 
		})
		.then(function onSuccess(sailsResponse){
			window.location = '/users';
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			toastr.error(sailsResponse.data, 'Error');

		})
		.finally(function eitherWay(){
			$scope.userdetailsForm.loading = false;
		})
	}

}])