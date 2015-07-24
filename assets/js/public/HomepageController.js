angular.module('EventsModule').controller('HomepageController', ['$scope', '$http', 'toastr', function($scope, $http, toastr){

	// set-up loginForm loading state
	$scope.loginForm = {
		loading: false
	}

  
	$scope.submitLoginForm = function (){
    /******NOT CURRENTLY USED ****/ 
    // Set the loading state (i.e. show loading spinner)
    $scope.loginForm.loading = true;

    // Submit request to Sails.
    $http.post('/auth/local', {
      identifier: $scope.loginForm.identifier,
      password: $scope.loginForm.password
    })
    .then(function onSuccess (){
      // Refresh the page now that we've been logged in.
      window.location = '/';
    })
    .catch(function onError(sailsResponse) {

      // Handle known error type(s).
      // Invalid username / password combination.
      if (sailsResponse.status === 400 || 404) {        
        toastr.error('Invalid email/user name/password combination.', 'Error', {
          closeButton: true
        });
        return;
      }

			toastr.error(i18n(sailsResponse.data), 'Error', {
				closeButton: true
			});
			return;

    })
    .finally(function eitherWay(){
      $scope.loginForm.loading = false;
    });
  };


}]);
