angular.module('PrivateModule').controller('DashboardController', ['$scope', '$http', '$location', 'toastr', function($scope, $http, $location, toastr) {
	
		// Initialise "user" in the scope with the data set in the view script 
		$scope.user=SAILS_LOCALS.user;
		
		// Some test data for the deckgrid
		$scope.photos = [
						    {
								id: 'p1', 
								'title': 'A nice day!', 
								src: "http://lorempixel.com/300/400/" 
							},
						    {
								id: 'p2', 
								'title': 'Puh!', 
								src: "http://lorempixel.com/300/400/sports" 
							},
						    {	id: 'p3',
								'title': 'What a club!', 
								src: "http://lorempixel.com/300/400/nightlife" 
							},		
							{
								id: 'p4', 
								'title': 'A nice day!', 
								src: "http://lorempixel.com/300/400/" 
							},
						    {
								id: 'p5', 
								'title': 'Puh!', 
								src: "http://lorempixel.com/300/400/sports" 
							},
						    {	id: 'p6',
								'title': 'What a club!', 
								src: "http://lorempixel.com/300/400/nightlife" 
							},							
						]
		
		// Get the events
		$http.get('/event')
		.then(function onSuccess(events){
			 $scope.events=events.data;
		})
		.catch(function onError(sailsResponse){

			// Handle known error type(s).
			toastr.error(sailsResponse.data, 'Error');

		})
		.finally(function eitherWay(){
			 
		})
		
						
}]);