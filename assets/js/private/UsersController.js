angular.module('EventsModule').controller('UsersController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		 
		$scope.filterForm = {
			loading: false,
			filter:SAILS_LOCALS.filter
		}

		// Get the users
		$http.get('/allusers/'+$scope.filterForm.filter)
			.success(function(data, status) {
				if (typeof data == 'object') {
					$scope.users = data;					
				}
				else {
					window.location = '/';
				}
			}).
			error(function(data, status, headers, config) {
		   		// called asynchronously if an error occurs
		    	// or server returns response with an error status.
				window.location = '/';
		  	}
		);
		  
		/**
		 * Filter users
		 */  
		$scope.filterUsers = function(){
			$scope.filterForm.loading=true;
			// Submit request to Sails.
			$http.get('/allusers/'+encodeURIComponent($scope.filterForm.filter))
				.then(function onSuccess(sailsResponse){
					if (typeof sailsResponse.data == 'object') {
						$scope.users = sailsResponse.data;					
					}
					else {
						window.location="/";
					}
				})
				.catch(function onError(sailsResponse){
		
					// Handle known error type(s).
					toastr.error(sailsResponse.data, 'Error');
					
		
				})
				.finally(function eitherWay(){
					$scope.filterForm.loading = false;
				})
		}

		/**
		 * Navigate to editor
		 */
		$scope.navigate = function(action,userId) {
			$document.location("/user/"+action+"?userid="+userId)
		}

}])