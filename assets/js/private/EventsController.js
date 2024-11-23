angular.module('EventsModule').controller('EventsController', [
  '$scope',
  '$http',
  'toastr',
  function ($scope, $http, toastr) {
    // Initialise "user" in the scope with the data set in the view script
    $scope.user = SAILS_LOCALS.user;

    $scope.filterForm = {
      loading: false,
      criteria: SAILS_LOCALS.criteria
    };

    //if ($scope.filterForm.incclosed) {
    //	$scope.filterForm.incclosed=true
    //}
    //else {
    //	$scope.filterForm.incclosed=false
    //}

    // Get the events
    $http
      .get('/allevents/' + encodeURIComponent(JSON.stringify($scope.filterForm.criteria)))
      .success(function (data, status) {
        if (typeof data == 'object') {
          $scope.events = data;
          $scope.augment($scope.events);
        } else {
          window.location = '/';
        }
      })
      .error(function (data, status, headers, config) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
        window.location = '/';
      });

    /**
     * Augment data
     **/
    $scope.augment = function (data) {
      // Traverse the events and calculate an appropriate width
      // for each event name
      angular.forEach(data, function (event) {
        // Calculate an appropriate width for the event name
        event.nameClass = 'event-name-100';
        if (event.logoRight) {
          if (event.logo) {
            event.nameClass = 'event-name-60';
          } else {
            event.nameClass = 'event-name-80';
          }
        } else {
          if (event.logo) {
            event.nameClass = 'event-name-80';
          }
        }
        // Font size override?
        event.eventNameStyle = null;
        if (event.eventNameSize) {
          event.eventNameStyle = 'font-size:' + event.eventNameSize;
        }
      });
    };

    /**
     * Filter events
     */
    //$scope.filterEvents = function() {
    //	$http.get('/allevents/'+$scope.filterForm.filter).success(function(data, status) {
    //	if (typeof data == 'object') {
    //		$scope.events = data;
    //	}
    //	}).
    //	error(function(data, status, headers, config) {
    //
    //  	});
    //}

    $scope.filterEvents = function () {
      $scope.filterForm.loading = true;
      // Submit request to Sails.
      $http
        .get('/allevents/' + encodeURIComponent(JSON.stringify($scope.filterForm.criteria)))
        .then(function onSuccess(sailsResponse) {
          if (typeof sailsResponse.data == 'object') {
            $scope.events = sailsResponse.data;
            $scope.augment($scope.events);
          } else {
            window.location = '/';
          }
        })
        .catch(function onError(sailsResponse) {
          // Handle known error type(s).
          toastr.error(sailsResponse.data, 'Error');
        })
        .finally(function eitherWay() {
          $scope.filterForm.loading = false;
        });
    };

    /**
     * Navigate to editor
     */
    $scope.navigate = function (action, eventId) {
      $document.location('/event/' + action + '?eventid=' + eventId);
    };
  }
]);
