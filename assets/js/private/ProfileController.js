angular.module('EventsModule').controller('ProfileController', ['$scope', '$http', '$timeout', 'toastr', 'ngDialog', function($scope, $http, $timeout, toastr, ngDialog){

	
	$scope.profileForm = {
		loading: false
	}

		
	// Initialise "user" in the scope with the data set in the view script 
	$scope.user=SAILS_LOCALS.user;
	$scope.profileForm = $scope.user;
	
	// Convert lodge no to numeric
	$scope.profileForm.lodgeNo = parseInt($scope.user.lodgeNo); 
	$scope.profileForm.voLodgeNo = parseInt($scope.user.voLodgeNo); 
	// Set the confirm email
	$scope.profileForm.confirmemail=$scope.profileForm.email; 
	 
	// Salutations
	$scope.salutations=SAILS_LOCALS.salutations;
		
	// Areas
	$scope.areas=SAILS_LOCALS.areas;	
 
 	// Set elements that have validity checking to dirty straight away 
 	angular.element(document).ready(function () {
		 $timeout($scope.setDirty);
	});
	
	/**
	 * Make erroneous fields dirty
	 */
	$scope.setDirty = function() {
		angular.forEach($scope.profile.$error.required, function(field) {
			field.$setDirty();
		}); 
		if (!$scope.profileForm.lodgeNo || isNaN($scope.profileForm.lodgeNo)) {
			$scope.profile.lodgeno.$setDirty();	
			$scope.profile.lodgeno.$setValidity("required",false);	
		}				
	}
	
	/**
	 * Test if the details are complete on the profile
	 */
	$scope.detailsComplete = function() {
		var complete=true;
		if (   (!$scope.profileForm.name || $scope.profileForm.name.length==0)
			|| (!$scope.profileForm.salutation || $scope.profileForm.salutation.length==0)
			|| (!$scope.profileForm.lodge || $scope.profileForm.lodge.length==0)
			|| (!$scope.profileForm.lodgeNo || isNaN($scope.profileForm.lodgeNo))
			|| (!$scope.profileForm.email || $scope.profileForm.email.length==0)
			|| (!$scope.profileForm.surname || $scope.profileForm.surname.length==0)
			|| (!$scope.profileForm.firstName || $scope.profileForm.firstName.length==0)
			|| (($scope.user.authProvider=="local")
					&& (   (!$scope.profileForm.username || $scope.profileForm.username.length==0)
			//			|| (!$scope.profileForm.password ||$scope.profileForm.password.length==0)
						)
				)
		) {
			$scope.setDirty();
			complete=false;
		}
			
		return complete;
	}		
	
	$scope.submitProfileForm = function(){
		$scope.profileForm.loading=true;
		
		var submitForm=function(){
			// Submit request to Sails.
			$http.post('/updateprofile', {
                _csrf: SAILS_LOCALS._csrf,
				profile: $scope.profileForm
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
		
		// Before submitting the form, check the domain and issue SPAM warning
		// if required
		var submit=true;
		if (!$scope.user.spamAck) {
			var domain;
			if ($scope.profileForm.email) {
				domain=$scope.profileForm.email.split("@")[1]
			} 
			var details;
			if (domain) {
				details=SAILS_LOCALS.spamDomains[domain.toLowerCase()];				
			}
			if (details) {
				// It is a troublesome domain
				details.domain=domain;
				if (details.additionalinfo) {
					details.additionalinfo=details.additionalinfo.replace(RegExp("/%sender%/","g"),SAILS_LOCALS.sender);
				}
				submit=false;
				$scope.spamWarning=details
				var opts={
					template:"/templates/spamWarning.html",
					className: 'ngdialog-theme-default',
					scope: $scope
				};
				// Pop the dialog
				ngDialog.open(opts)
					.closePromise.then(function (value) {
						// Continue  
						$scope.profileForm.spamAck=true;
						submitForm();
					});
			}
		}	 
		// Submit if we are not sending any warnings
		if (submit)
			submitForm()
	}

}])