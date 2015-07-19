angular.module('PrivateModule').controller('BookController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	
	$scope.bookingForm = {
		loading: false
	}

		
	// Initialise "user" in the scope with the data set in the view script 
	$scope.user=SAILS_LOCALS.user;
	$scope.event=SAILS_LOCALS.event;
	$scope.bookingForm = $scope.user;
	// Convert lodge no to numeric
	$scope.bookingForm.lodgeNo = parseInt($scope.user.lodgeNo); 
	// Initialise confirmation email
	$scope.bookingForm.confirmemail = $scope.bookingForm.email;
	
	/**
	 * Test if the details are complete on the profile
	 */
	$scope.detailsComplete = function() {
		var complete=true;
		if (   (!$scope.bookingForm.name || $scope.bookingForm.name.length==0)
			|| (!$scope.bookingForm.lodge || $scope.bookingForm.lodge.length==0)
			|| (!$scope.bookingForm.lodgeNo || isNaN($scope.bookingForm.lodgeNo))
			|| (!$scope.bookingForm.email || $scope.bookingForm.email.length==0)			
		) {
			complete=false;
		}
			
		return complete;
	}		
	
	/**
	 * Submit booking
	 */	
	$scope.submitBookingForm = function(){
		$scope.bookingForm.loading=true;
		// Submit request to Sails.
		$http.post('/makebooking', {
			eventid: $scope.event.id,			
		})
		.then(function onSuccess(sailsResponse){
			toastr.success("Your booking was successful")
			setTimeout(function(){
				window.location = '/'
			},1000);
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			toastr.error(sailsResponse.data, 'Error');
			$scope.bookingForm.loading = false;
		})
		.finally(function eitherWay(){
			//$scope.bookingForm.loading = false;
		})
	}

}])