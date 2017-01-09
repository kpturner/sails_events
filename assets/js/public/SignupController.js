angular.module('EventsModule').controller('SignupController', ['$scope', '$http', '$timeout', 'toastr', function($scope, $http, $timeout, toastr){

	$scope.signupForm = {
		loading: false,
		authProvider: "local",
	}

	/**
	 * Test if the details are complete on the user
	 */
	$scope.detailsComplete=function() {
		var complete=true;
		if (   (!$scope.signupForm.salutation || $scope.signupForm.salutation.length==0)
		    || ($scope.invalidUsername)	
		) {
			$scope.setDirty();
			complete=false;
		}
			
		return complete;
	}

	// Salutations
	$scope.salutations=SAILS_LOCALS.salutations;
	
	// Areas
	$scope.areas=SAILS_LOCALS.areas;

	// Lodge required?
	$scope.lodgeMandatory=SAILS_LOCALS.lodgeMandatory;
	 
	// Set elements that have validity checking to dirty straight away 
 	angular.element(document).ready(function () {
		 $timeout($scope.setDirty);
	});
	
	/**
	 * Make erroneous fields dirty
	 */
	$scope.setDirty = function() {
		angular.forEach($scope.signup.$error.required, function(field) {
			field.$setDirty();
		}); 
		$scope.signup.username.$setDirty();	
        if (!$scope.signup.username || $scope.signup.username.length==0)
            $scope.signup.username.$setValidity("required",false);	
		$scope.signup.lodgeno.$setDirty();	
		if (!$scope.signup.lodgeno || $scope.signup.lodgeno.length==0)
            $scope.signup.lodgeno.$setValidity("required",false);							
	}
	
    /**
     * Check user name 
     **/
    $scope.checkUsername=function(){
        $scope.invalidUsername=false;
        // Must not contain spaces
        $scope.signupForm.username=$.trim($scope.signupForm.username);
        if ($scope.signupForm.username.indexOf(" ")>=0) {
            $scope.invalidUsername=true;
        }
    } 		 

	$scope.submitSignupForm = function(){
		$scope.signupForm.loading=true;
		// Submit request to Sails.
		$http.post('/auth/local/register', {
            _csrf: SAILS_LOCALS._csrf,
			user: $scope.signupForm
			//name: $scope.signupForm.name,
			//username: $scope.signupForm.username,
			//lodge: $scope.signupForm.lodge,
			//lodgeNo: $scope.signupForm.lodgeNo,
			//rank: $scope.signupForm.rank,
			//dietary: $scope.signupForm.dietary,
			//isVO: $scope.signupForm.isVO,
			//voLodge: $scope.signupForm.voLodge,
			//voLodgeNo: $scope.signupForm.voLodgeNo,
			//email: $scope.signupForm.email,
			//password: $scope.signupForm.password,
			//surname: $scope.signupForm.surname,
			//firstName: $scope.signupForm.firstName,
		})
		.then(function onSuccess(sailsResponse){
			window.location = '/';
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			toastr.error(sailsResponse.data, 'Error');

		})
		.finally(function eitherWay(){
			$scope.signupForm.loading = false;
		})
	}

}])