angular.module('EventsModule').controller('ProfileController', [
  '$scope',
  '$http',
  '$timeout',
  'toastr',
  'ngDialog',
  function ($scope, $http, $timeout, toastr, ngDialog) {
    $scope.profileForm = {
      loading: false
    };

    // Initialise "user" in the scope with the data set in the view script
    $scope.user = SAILS_LOCALS.user;
    $scope.profileForm = $scope.user;
    $scope.permanentDiningList = SAILS_LOCALS.permanentDiningList;

    // Convert lodge no to numeric
    $scope.profileForm.lodgeNo = parseInt($scope.user.lodgeNo);
    $scope.profileForm.voLodgeNo = parseInt($scope.user.voLodgeNo);
    // Defaults if not entered
    if (!$scope.profileForm.lodge) {
      $scope.profileForm.lodge = SAILS_LOCALS.defaults.lodge;
    }
    if (!$scope.profileForm.lodgeNo) {
      $scope.profileForm.lodgeNo = SAILS_LOCALS.defaults.lodgeNo;
    }

    // Set the confirm email
    $scope.profileForm.confirmemail = $scope.profileForm.email;

    // Salutations
    $scope.salutations = SAILS_LOCALS.salutations;

    // Unit Type
    $scope.unitType = SAILS_LOCALS.unitType;

    // User categories
    $scope.userCategories = SAILS_LOCALS.userCategories;

    // Areas
    $scope.areas = SAILS_LOCALS.areas;

    // Centres
    $scope.centres = SAILS_LOCALS.centres;

    // Lodge required
    $scope.lodgeMandatory = SAILS_LOCALS.lodgeMandatory;

    // Signup mode?
    $scope.signup = SAILS_LOCALS.signup;

    // Set elements that have validity checking to dirty straight away
    angular.element(document).ready(function () {
      $timeout($scope.setDirty);
    });

    // Enable a repeater for other orders
    $scope.orders = SAILS_LOCALS.orders.filter(function (order) {
      return order.code !== 'C';
    });
    $scope.ordersArr = [];
    $scope.ordersModel = [];
    $scope.profileForm.otherorders = 0;
    $scope.otherOrdersString = '';
    for (var i = 0; i < $scope.orders.length; i++) {
      $scope.otherOrdersString += ', ' + $scope.orders[i].desc;
    }

    // makeOrdersArray is called every time the number of other orders changes
    $scope.makeOrdersArray = function () {
      $scope.ordersArr.length = 0;
      for (var i = 0; i < parseInt($scope.profileForm.otherorders); i++) {
        $scope.ordersArr.push(i);
        if (!$scope.ordersModel[i]) {
          $scope.ordersModel.push({
            code: $scope.orders[0].code
          });
        }
      }
    };

    $scope.convertAccount = function () {
      $scope.profileForm.loading = true;
      var opts = {
        template: '/templates/accountConversionConfirmation.html',
        className: 'ngdialog-theme-default',
        scope: $scope
      };
      // Pop the dialog
      ngDialog.openConfirm(opts).then(
        function (value) {
          // Continue
          $http
            .post('/convertaccount', {
              _csrf: SAILS_LOCALS._csrf,
              id: SAILS_LOCALS.user.id
            })
            .success(function (data, status) {
              window.location = '/logout';
            })
            .catch(function onError(sailsResponse) {
              // Handle known error type(s).
              toastr.error(sailsResponse.data, 'Error');
            })
            .finally(function eitherWay() {
              $scope.profileForm.loading = false;
            });
        },
        function (reason) {
          // They bottled it
          $scope.profileForm.loading = false;
        }
      );
    };

    // Get users other orders (if any)
    $http
      .get('/otherorders/' + SAILS_LOCALS.user.id)
      .success(function (data, status) {
        if (typeof data == 'object') {
          $scope.ordersModel = data;
          $scope.ordersModel.forEach(function (v, i) {
            $scope.ordersModel[i].number = parseInt($scope.ordersModel[i].number);
          });
          $scope.profileForm.otherorders = data.length;
          $scope.makeOrdersArray();
        }
      })
      .error(function (data, status, headers, config) {
        console.log('Error retrieving other orders ' + SAILS_LOCALS.user.id);
      });

    /**
     * Make erroneous fields dirty
     */
    $scope.setDirty = function () {
      angular.forEach($scope.profile.$error.required, function (field) {
        field.$setDirty();
      });
      if ($scope.lodgeMandatory && (!$scope.profileForm.lodgeNo || isNaN($scope.profileForm.lodgeNo))) {
        $scope.profile.lodgeno.$setDirty();
        $scope.profile.lodgeno.$setValidity('required', false);
      }
    };

    /**
     * Test if the details are complete on the profile
     */
    $scope.detailsComplete = function () {
      var complete = true;
      if (
        !$scope.profileForm.name ||
        $scope.profileForm.name.length == 0 ||
        !$scope.profileForm.salutation ||
        $scope.profileForm.salutation.length == 0 ||
        ($scope.lodgeMandatory && (!$scope.profileForm.lodge || $scope.profileForm.lodge.length == 0)) ||
        ($scope.lodgeMandatory && (!$scope.profileForm.lodgeNo || isNaN($scope.profileForm.lodgeNo))) ||
        !$scope.profileForm.email ||
        $scope.profileForm.email.length == 0 ||
        !$scope.profileForm.surname ||
        $scope.profileForm.surname.length == 0 ||
        !$scope.profileForm.firstName ||
        $scope.profileForm.firstName.length == 0 ||
        ($scope.user.authProvider == 'local' &&
          (!$scope.profileForm.username || $scope.profileForm.username.length == 0 || $scope.invalidUsername))
        //			|| (!$scope.profileForm.password ||$scope.profileForm.password.length==0)
      ) {
        $scope.setDirty();
        complete = false;
      }

      return complete;
    };

    /**
     * Check user name
     **/
    $scope.checkUsername = function () {
      $scope.invalidUsername = false;
      // Must not contain spaces
      $scope.profileForm.username = $.trim($scope.profileForm.username);
      if ($scope.profileForm.username.indexOf(' ') >= 0) {
        $scope.invalidUsername = true;
      }
    };

    $scope.submitProfileForm = function () {
      $scope.profileForm.loading = true;

      var submitForm = function () {
        while ($scope.ordersModel.length > $scope.profileForm.otherorders) {
          $scope.ordersModel.pop();
        }
        // Submit request to Sails.
        $http
          .post('/updateprofile', {
            _csrf: SAILS_LOCALS._csrf,
            profile: $scope.profileForm,
            orders: $scope.ordersModel
          })
          .then(function onSuccess(sailsResponse) {
            window.location = '/';
          })
          .catch(function onError(sailsResponse) {
            // Handle known error type(s).
            toastr.error(sailsResponse.data, 'Error');
          })
          .finally(function eitherWay() {
            $scope.profileForm.loading = false;
          });
      };

      // Before submitting the form, check the domain and issue SPAM warning
      // if required
      var submit = true;
      $scope.profileForm.email = $scope.profileForm.email.trim();
      if ($scope.profileForm.password) {
        $scope.profileForm.password = $scope.profileForm.password.trim();
      }
      if (!$scope.user.spamAck) {
        var domain;
        if ($scope.profileForm.email) {
          domain = $scope.profileForm.email.split('@')[1];
        }
        var details;
        if (domain) {
          details = SAILS_LOCALS.spamDomains[domain.toLowerCase()];
        }
        if (details) {
          // It is a troublesome domain
          details.domain = domain;
          if (details.additionalinfo) {
            details.additionalinfo = details.additionalinfo.replace(RegExp('/%sender%/', 'g'), SAILS_LOCALS.sender);
          }
          submit = false;
          $scope.spamWarning = details;
          var opts = {
            template: '/templates/spamWarning.html',
            className: 'ngdialog-theme-default',
            scope: $scope
          };
          // Pop the dialog
          ngDialog.open(opts).closePromise.then(function (value) {
            // Continue
            $scope.profileForm.spamAck = true;
            submitForm();
          });
        }
      }
      // Submit if we are not sending any warnings
      if (submit) submitForm();
    };
  }
]);
