angular.module('EventsModule').controller('ApologiesController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		 
		$scope.apologiesLoading=true;
		 
		$scope.filterForm = {
			loading: false,
			filter:	SAILS_LOCALS.filter,
			
		}
		
		 
		$scope.event 		= SAILS_LOCALS.event; 
		
		// Get the Apologies
		var route='/alleventapologies/'+encodeURIComponent($scope.filterForm.filter)+'?eventid='+$scope.event.id;
 
		$scope.downloadUrl=route+'&download=1';
		$http.get(route)
			.success(function(data, status) {
				if (typeof data == 'object') {
					$scope.apologies = data;							
				}
				else {
					window.location = '/';
				}				
			})
			.error(function(data, status, headers, config) {
		   		// called asynchronously if an error occurs
		    	// or server returns response with an error status.
				window.location = '/';
		  	})
			.finally(function(){
				$scope.apologiesLoading=false;
			})
		  
		/**
		 * Filter Apologies
		 */  
		$scope.filterApologies = function(){
			$scope.filterForm.loading=true;
			$scope.apologiesLoading=true;
			// Submit request to Sails.
			var route='/alleventapologies/'+encodeURIComponent($scope.filterForm.filter)+'?eventid='+$scope.event.id;
			 
			$http.get(route)
				.then(function onSuccess(sailsResponse){
					if (typeof sailsResponse.data == 'object') {
						$scope.apologies = sailsResponse.data;							
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
					$scope.apologiesLoading=false;
				})
		}
		
		
		/**
		 * Called if the filter box changes
		 */
		$scope.filterChanged = function(){
			$scope.downloadUrl='/alleventapologies/'+encodeURIComponent($scope.filterForm.filter)+'?eventid='+$scope.event.id+'&download=1';				
		}
		
		/**
		 * Download Apologies
		 */  
		$scope.downloadApologies = function(){
		
			window.location=$scope.downloadUrl;
		
		}	
		
		 
}])