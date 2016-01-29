angular.module('EventsModule').controller('EventDetailsController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	$scope.user=SAILS_LOCALS.user;
	$scope.mode=SAILS_LOCALS.mode;
	$scope.eventForm = {
		loading: false
	}

	
	$scope.eventForm=SAILS_LOCALS.event;
		
	// Get a list of users in name order
	$http.get("/organisers")
		.then(function onSuccess(sailsResponse){
			$scope.organisers=sailsResponse.data;			
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			toastr.error(sailsResponse.data, 'Error');

		})
		
    // Calculate an appropriate width for the event name
    $scope.nameWidth="100%";
    if ($scope.eventForm.logoRight) {
        if ($scope.eventForm.logo) {
             $scope.nameWidth="60%";
        }
        else {
             $scope.nameWidth="80%";
        }
    }   
    else {
         if ($scope.eventForm.logo) {
             $scope.nameWidth="80%";
        }
    } 
		
  	// Date handling functions
  
	// Calculate "today"
	$scope.today=new Date();
	
	// Convert the date/time
	$scope.eventForm.date = new Date($scope.eventForm.date);
	if ($scope.eventForm.time) {
		var timeArr=$scope.eventForm.time.split(":");
		$scope.eventForm.date.setHours(timeArr[0]); 
		$scope.eventForm.date.setMinutes(timeArr[1]); 
		$scope.eventForm.date.setSeconds(timeArr[2]); 
		$scope.eventForm.time = new Date($scope.eventForm.date);	
	}
	
	// Convert the opening date 
	if ($scope.eventForm.openingDate)
		$scope.eventForm.openingDate = new Date($scope.eventForm.openingDate);
	else
		$scope.eventForm.openingDate = $scope.today;
		
	// Convert the closing date 
	$scope.eventForm.closingDate = new Date($scope.eventForm.closingDate);
	
	// Function to clear date
	$scope.clear = function () {
		$scope.eventForm.date = null;
	};
	
	// Minimum bookings
	if ($scope.minBookingPlaces==0)
		$scope.minBookingPlaces=1;
	
	// Disable weekend selection
	$scope.disabled = function(date, mode) {
		return ( mode === 'day' && ( date.getDay() === 0 || date.getDay() === 6 ) );
	};
	
	$scope.dateOptions = {
		//formatYear: 'yy',
		startingDay: 1
	};
	
	$scope.openDate = function($event) {
		$event.preventDefault();
		$event.stopPropagation();
		
		$scope.dateOpened = true;
	};

	$scope.openOpeningDate = function($event) {
		$event.preventDefault();
		$event.stopPropagation();
		
		$scope.openingDateOpened = true;
	};

	$scope.openClosingDate = function($event) {
		$event.preventDefault();
		$event.stopPropagation();
		
		$scope.closingDateOpened = true;
	};

	
	/**
	 * Test if the details are complete on the event
	 */
	$scope.detailsComplete = function() {
		var complete=true;
		if (   (!$scope.eventForm.name || $scope.eventForm.name.length==0)
			|| (!$scope.eventForm.organiser || isNaN($scope.eventForm.organiser))
			|| (!$scope.eventForm.code || $scope.eventForm.code.length==0)
			|| (!$scope.eventForm.venue || $scope.eventForm.venue.length==0)
			|| (!$scope.eventForm.date || $scope.eventForm.date.length==0)
			|| (!$scope.eventForm.time || $scope.eventForm.time.length==0)
			|| (!$scope.eventForm.price || isNaN($scope.eventForm.price))
			|| (!$scope.eventForm.minBookingPlaces || isNaN($scope.eventForm.minBookingPlaces))
			|| (!$scope.eventForm.maxBookingPlaces || isNaN($scope.eventForm.maxBookingPlaces))
			|| (!$scope.eventForm.openingDate || $scope.eventForm.openingDate.length==0)
			|| (!$scope.eventForm.closingDate || $scope.eventForm.closingDate.length==0)	
			|| (!$scope.eventForm.capacity || isNaN($scope.eventForm.capacity))
		) {
			complete=false;
		}
			
		return complete;
	}		
	
	$scope.submitEventForm = function(){
		$scope.eventForm.loading=true;
						
		if ($scope.eventForm.maxBookingPlaces<$scope.eventForm.minBookingPlaces)
			$scope.eventForm.maxBookingPlaces=$scope.eventForm.minBookingPlaces;		
				
						
		// Submit request to Sails.
		$http.post('/updateevent/'+$scope.mode, {
            _csrf: SAILS_LOCALS._csrf,
			data: $scope.eventForm			 
		})
		.then(function onSuccess(sailsResponse){
			window.location = '/events';
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			toastr.error(sailsResponse.data, 'Error');

		})
		.finally(function eitherWay(){
			$scope.eventForm.loading = false;
		})
	}

}])