angular.module('EventsModule').controller('DashboardController', ['$scope', '$http', '$location', 'toastr', 'ngDialog', function($scope, $http, $location, toastr, ngDialog) {
	
		// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		$scope.userBookings=false;
		$scope.selectedUser={};
		$scope.dashboard=true;
		$scope.usersCanViewBookings=SAILS_LOCALS.usersCanViewBookings;

		// Has an applicationm update been requested?
		if (SAILS_LOCALS.appUpdateRequested) {
			var opts={
				template:"/templates/updateConfirmation.html",
				className: 'ngdialog-theme-default',
				scope: $scope
			};
			// Pop the dialog
			ngDialog.openConfirm(opts)
				.then(function (value) {
					// Continue update
					$http.get('/updateapp').success(function(data, status) {
						// Let it go
					});
					window.location = '/';
				}, function (reason) {
					// They bottled it					
				});	
		}

		// Are we attempting to mimic a user?
		if (SAILS_LOCALS.mimicUserRequested) {
			// Get a list of users that excludes this user
			$http.get('/user?_csrf='+SAILS_LOCALS._csrf+'&where={"id":{"not":"'+encodeURIComponent(SAILS_LOCALS.user.id.toString())+'"}}&sort=surname&limit=10000')
				.then(function onSuccess(sailsResponse){
					if (typeof sailsResponse.data == 'object') {
						$scope.users = sailsResponse.data;
						// Prompt the user to select a user to mimic
						var opts={
							template:"/templates/mimicUser.html",
							className: 'ngdialog-theme-default',
							scope: $scope
							};
						// Pop the dialog
						$scope.dashboard={};
						ngDialog.openConfirm(opts)
							.then(function (value) {
								// Mimic user
								$http.post('/mimicuser',{
									_csrf: SAILS_LOCALS._csrf,
									mimicuser:$scope.dashboard.mimicUser
								})
								.then(function(){
									window.location="/";
								})
								.catch(function(sailsResponse){
									toastr.error(sailsResponse.data, 'Error');									
								})
							}, 
							function (reason) {
								
							});						
					}
					else {
						toastr.error(origResponse.data, 'Error');  
					}
				})
				.catch(function onError(sailsResponse){
		
					// Handle known error type(s).
					toastr.error(sailsResponse.data, 'Error');
					$scope.bookingForm.transferring=false;
		
				})
				.finally(function eitherWay(){
					// Nothing to do
				})
		}

		// Get the events
		$http.get('/openevents').success(function(data, status) {
			if (typeof data == 'object') {
				// Filter out VO only events if this user is not a VO
				//if (!$scope.user.isVO) {
				//	data=$.grep(data,function(event,index){
				//		return (!event.voOnly)
				//	})
				//}
				$scope.events = data;	
                // Traverse the events and calculate an appropriate width
                    // for each event name
                    angular.forEach($scope.events,function(event){
                        // Calculate an appropriate width for the event name
                        event.nameClass="event-name-100";
                        if (event.logoRight) {
                            if (event.logo) {
                                event.nameClass="event-name-60";
                            }
                            else {
                                event.nameClass="event-name-80";
                            }
                        }   
                        else {
                            if (event.logo) {
                                event.nameClass="event-name-80";
                            }
                        }
						// Font size override?
						event.eventNameStyle=null;
						if (event.eventNameSize) {
							event.eventNameStyle="font-size:"+event.eventNameSize;
						} 		
                    })				
			}
			else {
				window.location = '/';
			}
		}).
		error(function(data, status, headers, config) {
	   		// called asynchronously if an error occurs
	    	// or server returns response with an error status.
			window.location = '/';
	  	});
		
		/**
		 * Download log
		 */
		$scope.downloadLog=function(){
			window.location="log";			
		}		

		/**
		 * Delete log
		 */
		$scope.deleteLog=function(){
			$http.post('/log/delete', {
				_csrf: SAILS_LOCALS._csrf		 
			}).success(function(data, status) {
				// Good!
			}).
			error(function(data, status, headers, config) {
				// called asynchronously if an error occurs
				// or server returns response with an error status.
				window.location = '/';
			});			
		}		
								
}]);