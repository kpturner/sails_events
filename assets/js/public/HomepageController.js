angular.module('PublicModule').controller('HomepageController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	// Initialise session storage 
	sessionStorage.setItem('me',null);   
	  
	$scope.toggleNavbar = function (){
     	// Click on a timer to stop the $apply is already in progress error 
		// https://docs.angularjs.org/error/$rootScope/inprog
	 	setTimeout(function(){
			$(".navbar-toggle").click()
			$("[name=email]").focus();
		},0);
    
  	};


}]);
