angular.module('EventsModule').controller('UsersController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		
		// Animate a spinner while we load the users
		$scope.usersLoading=true;
		 
		$scope.filterForm = {
			loading: false,
			paging: false,			
			criteria:SAILS_LOCALS.criteria,
		}

		// Get the users
		$http.get('/allusers/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria)))
			.success(function(data, status) {
				$scope.usersLoading=false;
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
		$scope.filterUsers = function(paging){
			if (paging) {
				$scope.filterForm.paging=true;
			}
			else {
				$scope.filterForm.loading=true;
			}
			$scope.usersLoading=true;
			// Submit request to Sails.
			$http.get('/allusers/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria)))
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
					$scope.filterForm.paging = false;
					$scope.usersLoading=false;
				})
		}

		/**
		 * Navigate to editor
		 */
		$scope.navigate = function(action,userId) {
			$document.location("/user/"+action+"?userid="+userId)
		}

}])