angular.module('EventsModule').controller('HomepageController', ['$scope', '$http', 'toastr', 'ngDialog', function($scope, $http, toastr, ngDialog){

	// set-up loginForm loading state
	$scope.loginForm = {
		loading: false
	}

  $scope.developer=SAILS_LOCALS.developer;

  localStorage.setItem('dashboardFilter', '');

  // Check that cookies are allowed
  $scope.checkCookie=function(){
    var cookieEnabled=(navigator.cookieEnabled)? true : false;
    if (typeof navigator.cookieEnabled=="undefined" && !cookieEnabled){ 
      document.cookie="testcookie";
      cookieEnabled=(document.cookie.indexOf("testcookie")!=-1)? true : false;
    }
    return (cookieEnabled)?true:showCookieFail();
  }

  function showCookieFail(){
    // Warn the user
    var opts={
      template:"/templates/cookieWarning.html",
      className: 'ngdialog-theme-default',
      scope: $scope
    };
    // Pop the dialog
    ngDialog.openConfirm(opts)
      .then(function (value) {
       }, 
       function (reason) {
       });	
  }


// within a window load,dom ready or something like that place your:
  $scope.checkCookie();
  
	$scope.submitLoginForm = function (){
    /******NOT CURRENTLY USED ****/ 
    // Set the loading state (i.e. show loading spinner)
    $scope.loginForm.loading = true;

    // Submit request to Sails.
    $http.post('/auth/local', {
      _csrf: SAILS_LOCALS._csrf,
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
