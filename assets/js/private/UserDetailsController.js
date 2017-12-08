angular.module('EventsModule').controller('UserDetailsController', ['$scope', '$http', 'toastr', 'ngDialog', function($scope, $http, toastr, ngDialog){

	$scope.user=SAILS_LOCALS.user;
	$scope.mode=SAILS_LOCALS.mode;
	$scope.permanentDiningList=SAILS_LOCALS.permanentDiningList;
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

	// User categories
	$scope.userCategories=SAILS_LOCALS.userCategories;	
    	
	// Areas
	$scope.areas=SAILS_LOCALS.areas;

	// Centres
	$scope.centres=SAILS_LOCALS.centres;
    
	// Lodge required
	$scope.lodgeMandatory=SAILS_LOCALS.lodgeMandatory;
    
    // New user for transferring bookings
    $scope.userdetailsForm.newuser="";

    // Enable a repeater for other orders
	$scope.orders=SAILS_LOCALS.orders;
	$scope.ordersArr=[];
	$scope.ordersModel=[];
	$scope.userdetailsForm.otherorders=0;

	// makeOrdersArray is called every time the number of other orders changes
	$scope.makeOrdersArray = function(){
		$scope.ordersArr.length=0;
		for (var i=0;i<(parseInt($scope.userdetailsForm.otherorders));i++) {
			$scope.ordersArr.push(i);
            if (!$scope.ordersModel[i]) {
                $scope.ordersModel.push({
                    code: $scope.orders[0].code
                });
            }
		} 
	}

    // Get users other orders (if any)
	$http.get("/otherorders/"+SAILS_LOCALS.userDetails.id).success(function(data, status) {
		if (typeof data == 'object') {
			$scope.ordersModel=data;	 	
			$scope.ordersModel.forEach(function(v,i){
				$scope.ordersModel[i].number=parseInt($scope.ordersModel[i].number)
			});
            $scope.userdetailsForm.otherorders=data.length;
			$scope.makeOrdersArray();		
		}				
	})
	.error(function(data, status, headers, config) {
		console.log("Error retrieving other orders "+SAILS_LOCALS.userDetails.id)
	});
	
	/**
	 * Test if the details are complete on the user
	 */
	$scope.detailsComplete = function() {
		var complete=true;
		if (   (!$scope.userdetailsForm.name || $scope.userdetailsForm.name.length==0)
			|| (!$scope.userdetailsForm.salutation || $scope.userdetailsForm.salutation.length==0)
			|| (($scope.userdetailsForm.authProvider!="dummy")
					&& (!$scope.userdetailsForm.email || $scope.userdetailsForm.email.length==0)
				)
            || (($scope.userdetailsForm.authProvider!="dummy" && $scope.lodgeMandatory)
					&& (
						 	(!$scope.userdetailsForm.lodge || $scope.userdetailsForm.lodge.length==0)
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
			data: $scope.userdetailsForm,
            orders: $scope.ordersModel			 
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
                $scope.userdetailsForm.loading = false; 
            }
		})
		.finally(function eitherWay(){
			
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
                                $scope.userdetailsForm.loading = false;
                                toastr.error(sailsResponse.data, 'Error');
                            })
                        }, 
                        function (reason) {
                            $scope.userdetailsForm.loading = false;
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
                $scope.userdetailsForm.loading = false;
    
            })
            .finally(function eitherWay(){
                // Nothing to do
            })
    }

}])