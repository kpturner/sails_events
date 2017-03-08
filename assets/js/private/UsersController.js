angular.module('EventsModule').controller('UsersController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

		// Lets trap the scroll to bottom on the body and
		// increment the page when they get there (it will load more data if need be)
		$(document).ready(function(){			
			$(window).scroll($scope.scroll);			
		});
		
		$scope.scroll=function(){ 
			if(!$scope.scrollDisabled) {
				// Use >= (not ==) if we want iPads to work 
				if($(window).scrollTop() + $(window).height() >= $(document).height()) {
					// Hit bottom
					$scope.scrollPage+=1;
					$scope.filterForm.criteria.page=$scope.scrollPage;
					$scope.filterForm.criteria.limit=$scope.initialLimit;
					$scope.scrollDisabled=true;
					$scope.filterUsers(false,true,function(data){	
						if (data.length==0) {
							// Out of data
							$scope.scrollPage-=1;
						}												
						// Change the filter criteria to match what we really have
						$scope.filterForm.criteria.limit=$scope.scrollPage*$scope.initialLimit;
						$scope.filterForm.criteria.page=$scope.initialPage;
						// Dummy get just to update the criteria server side
						$http.get('/allusers/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria))+"?nodata=1"); 	
						if (data.length>0) {
							setTimeout(function(){
								$scope.scrollDisabled=false;							
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
		}
		$scope.initialLimit=SAILS_LOCALS.criteria.limit;
		$scope.initialPage=SAILS_LOCALS.criteria.page;
		$scope.scrollPage=1;
		// If paging is not visible (i.e. the user cannot do it manually because of screen size)
		// make sure that page is set to 1 regardless of what was stored in the session. This 
		// means that if the user has partially scrolled with dynamic update and then clicks
		// on this screen again they go back to the beginning
		if (!$("#page").is(":visible")) {
			$scope.filterForm.criteria.page=1;
		}

		// Get the users
		$http.get('/allusers/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria)))
			.success(function(data, status) {
				$scope.usersLoading=false;
				if (typeof data == 'object') {
					$scope.users = data; 
                	$scope.augment($scope.users);
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
		$scope.filterUsers = function(paging,scrolling,cb){
			if (paging) {
				$scope.filterForm.paging=true;
				$scope.initialLimit=$scope.filterForm.criteria.limit;			
			}
			else {
				$scope.filterForm.loading=true;
			}
			$scope.usersLoading=true;
			// Submit request to server.
			$http.get('/allusers/'+encodeURIComponent(JSON.stringify($scope.filterForm.criteria)))
				.then(function onSuccess(sailsResponse){
					if (typeof sailsResponse.data == 'object') {
						$scope.augment(sailsResponse.data);	
						if (scrolling) {
							// Add data to existing scope
							$scope.users = $.merge($scope.users,sailsResponse.data);
							// Run callback if required
							if (cb && typeof cb=="function") {
								cb(sailsResponse.data);
							}	
							else {								
								$scope.scrollDisabled=false;
							}		
						}
						else {
							$scope.users = sailsResponse.data;	
							$scope.scrollDisabled=false;	
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