angular.module('EventsModule').controller('EventDetailsController', [
  '$scope',
  '$http',
  'toastr',
  'ngDialog',
  function ($scope, $http, toastr, ngDialog) {
    $scope.user = SAILS_LOCALS.user;
    $scope.mode = SAILS_LOCALS.mode;
    $scope.paymentPlatformsAvailable = [];
    $scope.paymentPlatforms = $.extend({}, SAILS_LOCALS.paymentPlatforms);
    for (var platform in $scope.paymentPlatforms) {
      if ($scope.paymentPlatforms.hasOwnProperty(platform)) {
        $scope.paymentPlatformsAvailable.push({ code: platform, desc: platform });
      }
    }

    $scope.eventForm = {
      loading: false
    };

    $scope.orders = $.extend([], SAILS_LOCALS.orders);
    $scope.eventForm = $.extend({}, SAILS_LOCALS.event);

    if ($scope.mode === 'create') {
      $scope.eventForm.recoverOnlinePaymentFee = true;
    }

    if (SAILS_LOCALS.mode == 'create') {
      $scope.eventForm.logo = SAILS_LOCALS.logo;
    }

    // Get a list of organisers in name order
    $http
      .get('/organisers')
      .then(function onSuccess(sailsResponse) {
        $scope.organisers = sailsResponse.data;
      })
      .catch(function onError(sailsResponse) {
        // Handle known error type(s).
        toastr.error(sailsResponse.data, 'Error');
      });

    // Get a list of DCs in name order
    $http
      .get('/dcs')
      .then(function onSuccess(sailsResponse) {
        $scope.dcs = sailsResponse.data;
      })
      .catch(function onError(sailsResponse) {
        // Handle known error type(s).
        toastr.error(sailsResponse.data, 'Error');
      });

    // Date handling functions
    convertTime = function () {
      if ($scope.eventForm.time) {
        var timeArr = $scope.eventForm.time.split(':');
        $scope.eventForm.date.setHours(timeArr[0]);
        $scope.eventForm.date.setMinutes(timeArr[1]);
        $scope.eventForm.date.setSeconds(timeArr[2]);
        $scope.eventForm.time = new Date($scope.eventForm.date);
      }
      if ($scope.eventForm.openingTime) {
        var timeArr = $scope.eventForm.openingTime.split(':');
        $scope.eventForm.openingDate.setHours(timeArr[0]);
        $scope.eventForm.openingDate.setMinutes(timeArr[1]);
        $scope.eventForm.openingDate.setSeconds(timeArr[2]);
        $scope.eventForm.openingTime = new Date($scope.eventForm.openingDate);
      }
    };

    // Calculate "today"
    $scope.today = new Date();

    // Convert the date/time
    $scope.eventForm.date = new Date($scope.eventForm.date);

    // Convert the opening date
    if ($scope.eventForm.openingDate) {
      $scope.eventForm.openingDate = new Date($scope.eventForm.openingDate);
    } else {
      $scope.eventForm.openingDate = $scope.today;
    }
    convertTime();

    // Convert the closing date
    $scope.eventForm.closingDate = new Date($scope.eventForm.closingDate);

    // Function to clear date
    $scope.clear = function () {
      $scope.eventForm.date = null;
    };

    // Minimum bookings
    if ($scope.minBookingPlaces == 0) $scope.minBookingPlaces = 1;

    // Disable weekend selection
    $scope.disabled = function (date, mode) {
      return mode === 'day' && (date.getDay() === 0 || date.getDay() === 6);
    };

    $scope.dateOptions = {
      //formatYear: 'yy',
      startingDay: 1
    };

    $scope.openDate = function ($event) {
      $event.preventDefault();
      $event.stopPropagation();

      $scope.dateOpened = true;
    };

    $scope.openOpeningDate = function ($event) {
      $event.preventDefault();
      $event.stopPropagation();

      $scope.openingDateOpened = true;
    };

    $scope.openClosingDate = function ($event) {
      $event.preventDefault();
      $event.stopPropagation();

      $scope.closingDateOpened = true;
    };

    /**
     *
     * Calculate price when recovering fee
     */
    $scope.calculatePrice = function () {
      $scope.eventForm.actualPrice = 0;
      if ($scope.paymentPlatforms && $scope.eventForm.onlinePaymentConfig) {
        const config = $scope.paymentPlatforms[$scope.eventForm.onlinePaymentPlatform].find(
          (plat) => plat.code === $scope.eventForm.onlinePaymentConfig
        );
        if (config && $scope.eventForm.recoverOnlinePaymentFee) {
          $scope.eventForm.actualPrice = parseFloat(
            (($scope.eventForm.price + config.fixedFee) / (1 - config.fee)).toFixed(2)
          );
        }
      }
    };

    $scope.calculatePrice();

    /**
     * Test if the details are complete on the event
     */
    $scope.detailsComplete = function () {
      var complete = true;
      if (
        !$scope.eventForm.name ||
        $scope.eventForm.name.length == 0 ||
        !$scope.eventForm.organiser ||
        isNaN($scope.eventForm.organiser) ||
        !$scope.eventForm.code ||
        $scope.eventForm.code.length == 0 ||
        !$scope.eventForm.venue ||
        $scope.eventForm.venue.length == 0 ||
        !$scope.eventForm.date ||
        $scope.eventForm.date.length == 0 ||
        !$scope.eventForm.time ||
        $scope.eventForm.time.length == 0 ||
        (!$scope.eventForm.free && (!$scope.eventForm.price || isNaN($scope.eventForm.price))) ||
        !$scope.eventForm.minBookingPlaces ||
        isNaN($scope.eventForm.minBookingPlaces) ||
        !$scope.eventForm.maxBookingPlaces ||
        isNaN($scope.eventForm.maxBookingPlaces) ||
        !$scope.eventForm.openingDate ||
        $scope.eventForm.openingDate.length == 0 ||
        !$scope.eventForm.openingTime ||
        $scope.eventForm.openingTime.length == 0 ||
        !$scope.eventForm.closingDate ||
        $scope.eventForm.closingDate.length == 0 ||
        isNaN($scope.eventForm.capacity) ||
        (!isNaN($scope.eventForm.capacity) && $scope.eventForm.capacity < 0)
      ) {
        complete = false;
      }

      return complete;
    };

    $scope.submitEventForm = function () {
      $scope.eventForm.loading = true;

      // Firstly we have to decide if the user has changed the grace period and warn them of
      // the consequences
      if (SAILS_LOCALS.event.grace && $scope.eventForm.grace && SAILS_LOCALS.event.grace != $scope.eventForm.grace) {
        // Warn the user
        $scope.eventForm.informGraceChanged = true;
        var opts = {
          template: '/templates/graceWarning.html',
          className: 'ngdialog-theme-default',
          scope: $scope
        };
        // Pop the dialog
        ngDialog.openConfirm(opts).then(
          function (value) {
            updateEvent($scope.eventForm.informGraceChanged);
          },
          function (reason) {
            $scope.eventForm.loading = false;
          }
        );
      } else {
        updateEvent();
      }

      function updateEvent(graceChanged) {
        if ($scope.eventForm.maxBookingPlaces < $scope.eventForm.minBookingPlaces) {
          $scope.eventForm.maxBookingPlaces = $scope.eventForm.minBookingPlaces;
        }
        $scope.eventForm.time = $scope.eventForm.time.toTimeString().split(' ')[0];
        $scope.eventForm.openingTime = $scope.eventForm.openingTime.toTimeString().split(' ')[0];
        var offset = $scope.eventForm.openingDate.getTimezoneOffset();
        $scope.eventForm.openingDate.setMinutes($scope.eventForm.openingDate.getMinutes() - offset);

        // Submit request to Sails.
        var route =
          '/updateevent/' +
          $scope.mode +
          ($scope.mode == 'edit' && graceChanged ? '?gracechangedto=' + SAILS_LOCALS.event.grace : '');
        $http
          .post(route, {
            _csrf: SAILS_LOCALS._csrf,
            data: $scope.eventForm
          })
          .then(function onSuccess(sailsResponse) {
            window.location = '/events';
          })
          .catch(function onError(sailsResponse) {
            convertTime();
            // Handle known error type(s).
            toastr.error(sailsResponse.data, 'Error');
          })
          .finally(function eitherWay() {
            $scope.eventForm.loading = false;
          });
      }
    };
  }
]);
