angular.module('EventsModule').controller('UserDetailsController', ['$scope', '$http', 'toastr', 'ngDialog', function($scope, $http, toastr, ngDialog){

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
	
	// Salutations
	$scope.salutations=SAILS_LOCALS.salutations;	
    	
	// Areas
	$scope.areas=SAILS_LOCALS.areas;
    
    // New user for transfering bookings
    $scope.userdetailsForm.newuser="HELLO";
	
	/**
	 * Test if the details are complete on the user
	 */
	$scope.detailsComplete = function() {
		var complete=true;
		if (   (!$scope.userdetailsForm.name || $scope.userdetailsForm.name.length==0)
			|| (!$scope.userdetailsForm.salutation || $scope.userdetailsForm.salutation.length==0)
			|| (($scope.userdetailsForm.authProvider!="dummy")
					&& (
							(!$scope.userdetailsForm.email || $scope.userdetailsForm.email.length==0)
						|| 	(!$scope.userdetailsForm.lodge || $scope.userdetailsForm.lodge.length==0)
						|| 	(!$scope.userdetailsForm.lodgeNo || isNaN($scope.userdetailsForm.lodgeNo))
					)
				)
			|| (!$scope.userdetailsForm.surname || $scope.userdetailsForm.surname.length==0)
			|| (!$scope.userdetailsForm.firstName || $scope.userdetailsForm.firstName.length==0)
			|| (($scope.userdetailsForm.authProvider=="local")
					&& (   (!$scope.userdetailsForm.username || $scope.userdetailsForm.username.length==0  || $scope.invalidUsername)
			//			|| (!$scope.userdetailsForm.password ||$scope.userdetailsForm.password.length==0)
						)
				)
		) {
			complete=false;
		} 
			
		return complete;
	}		
	
    /**
     * Check user name 
     **/
    $scope.checkUsername=function(){
        $scope.invalidUsername=false;
        // Must not contain spaces
        $scope.userdetailsForm.username=$.trim($scope.userdetailsForm.username);
        if ($scope.userdetailsForm.username.indexOf(" ")>=0) {
            $scope.invalidUsername=true;
        }
    } 		
    
	$scope.submitUserForm = function(){
		$scope.userdetailsForm.loading=true;
						
		// Submit request to Sails.
		$http.post('/updateuser/'+$scope.mode, {
            _csrf: SAILS_LOCALS._csrf,
			data: $scope.userdetailsForm			 
		})
		.then(function onSuccess(sailsResponse){
			window.location = '/users';
		})
		.catch(function onError(sailsResponse){

            // Response status of 460 means the user has bookings. Offer the option of allocating them to 
            // another user if this user is a "dummy" created by the organiser
            if (sailsResponse.status==460 && SAILS_LOCALS.userDetails.authProvider=="dummy") {
                $scope.transferDialog(sailsResponse);                    
            }  
            else {
                // Handle known error type(s).
                toastr.error(sailsResponse.data, 'Error');   
            }
		})
		.finally(function eitherWay(){
			$scope.userdetailsForm.loading = false;
		})
	}
    
    $scope.transferDialog = function(origResponse) {
        // Get a list of users that excludes this user
        $http.get('/user?_csrf='+SAILS_LOCALS._csrf+'&where={"id":{"not":"'+encodeURIComponent(SAILS_LOCALS.userDetails.id.toString())+'"}}&sort=surname')
            .then(function onSuccess(sailsResponse){
                if (typeof sailsResponse.data == 'object') {
                    $scope.users = sailsResponse.data;
                    // Prompt the user to select a user to transfer
                    // the bookings to
                    var opts={
                        template:"/templates/bookingsTransfer.html",
                        className: 'ngdialog-theme-default',
                        scope: $scope
                        };
                    // Pop the dialog
                    ngDialog.openConfirm(opts)
                        .then(function (value) {
                            // Transfer bookings and try again
                            $http.post('/booking/transfer',{
                                _csrf: SAILS_LOCALS._csrf,
                                id:SAILS_LOCALS.userDetails.id,
                                newuser:$scope.userdetailsForm.newuser
                            })
                            .then(function(){
                                // Try delete again
                                $scope.submitUserForm();
                            })
                            .catch(function(sailsResponse){
                                 toastr.error(sailsResponse.data, 'Error');
                            })
                        }, 
                        function (reason) {
                            toastr.error(origResponse.data, 'Error');  
                        });						
                }
                else {
                     toastr.error(origResponse.data, 'Error');  
                }
            })
            .catch(function onError(sailsResponse){
    
                // Handle known error type(s).
                toastr.error(sailsResponse.data, 'Error');
                
    
            })
            .finally(function eitherWay(){
                // Nothing to do
            })
    }

}])