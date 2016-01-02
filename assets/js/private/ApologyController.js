angular.module('EventsModule').controller('ApologyController', ['$scope', '$http', 'toastr', 'ngDialog', function($scope, $http, toastr, ngDialog){

	
	$scope.apologyForm = {
		loading: false
	}

		
	// Initialise "user" in the scope with the data set in the view script 
	$scope.user=SAILS_LOCALS.user;
	$scope.event=SAILS_LOCALS.event;
	$scope.mode=SAILS_LOCALS.mode;
	$scope.existingBooking=SAILS_LOCALS.bookingId;
	$scope.existingApology=SAILS_LOCALS.apology.id;
	if ($scope.existingApology)
		$scope.apologyForm.message = SAILS_LOCALS.apology.message;	
	
	/**
	 * Submit apology
	 */	
	$scope.submitApologyForm = function(){
		
		$scope.apologyForm.loading=true;
		
		$http.post('/sendapology/', {
            _csrf: SAILS_LOCALS._csrf,
			eventid: SAILS_LOCALS.event.id,
			message: $scope.apologyForm.message			 
		})
		.then(function onSuccess(sailsResponse){
			toastr.success("You have successfully sent your apologies")	
			setTimeout(function(){
				window.location = '/'	
			},1000)				
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			toastr.error(sailsResponse.data, 'Error');
			$scope.apologyForm.loading = false;

		})
		.finally(function eitherWay(){
			//$scope.bookingForm.loading = false;
		})
		
	}	 

}])