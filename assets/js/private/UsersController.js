angular.module('EventsModule').controller('UsersController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

		// Lets trap the scroll to bottom on the body and
		// increment the page when they get there (it will load more data if need be)
		$(document).ready(function(){			
			$(window).scroll($scope.scroll);
		});
		
		$scope.scroll=function(){ 
			if(!$scope.pagingDisabled) {
				if($(window).scrollTop() == $(document).height() - $(window).height()) {
					$scope.filterForm.criteria.limit+=$scope.filterForm.initialLimit;
					$scope.pagingDisabled=true;
					$scope.filterUsers(true,function(){
						if ($scope.filterForm.totalLoaded!=$scope.users.length) {
							$scope.filterForm.totalLoaded=$scope.users.length;
							setTimeout(function(){
								$scope.pagingDisabled=false;
							},500)		
						}									
					});			
				}				
			}			
		}

		
		// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		
		// Animate a spinner while we load the users
		$scope.usersLoading=true;
		 
		$scope.filterForm = {
			loading: false,
			paging: false,			
			criteria:SAILS_LOCALS.criteria,			
			initialLimit:SAILS_LOCALS.criteria.limit,
			totalLoaded:0
		}

		// Get the users
		$http.get('/allusers/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria)))
			.success(function(data, status) {
				$scope.usersLoading=false;
				if (typeof data == 'object') {
					$scope.users = data; 
                	$scope.augment($scope.users);
					$scope.filterForm.totalLoaded=$scope.users.length;	
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
		 * Augment data 
		 **/  
		$scope.augment=function(data){
			// Traverse the events and calculate an appropriate width
			// for each event name
			angular.forEach(data,function(user){
				// Calculate an appropriate width for the user name
				user.nameClass="user-name-100";
				if (user.gravatarUrl) {
					user.showPicture=true;
					user.nameClass="user-name-65";                            
				}                          
			})				
		};

		/**
		 * Filter users
		 */  
		$scope.filterUsers = function(paging,cb){
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
						$scope.augment($scope.users);		
						if (cb && typeof cb=="function") {
							cb();
						}	
						else {
							$scope.filterForm.totalLoaded=$scope.users.length;
							$scope.pagingDisabled=false;
						}		
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