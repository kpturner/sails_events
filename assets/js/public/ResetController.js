angular.module('EventsModule').controller('ResetController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	
	$scope.resetForm = {
		loading: false
	}

		
	/**
	 * Test if the details are complete on the profile
	 */
	$scope.detailsComplete = function() {
		var complete=true;
		if ( !$scope.resetForm.email || $scope.resetForm.email.length==0) {
			complete=false;
		}
			
		return complete;
	}		
	
	$scope.submitResetForm = function(){
		$scope.resetForm.loading=true;
		// Submit request to Sails.
		$http.post('/auth/passwordreset', {
			email: $scope.resetForm.email,
		})
		.then(function onSuccess(sailsResponse){
			window.location = '/';
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			toastr.error(sailsResponse.data, 'Error');

		})
		.finally(function eitherWay(){
			$scope.resetForm.loading = false;
		})
	}

}])