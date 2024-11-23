// Nasty hack to force a page to reload in Safari iOS when the back button is used
// This prevents the browser from loading a cached page and leaving all our scoped
// data as it was when the user navigated away
window.onpageshow = function (event) {
  if (event.persisted) {
    window.location.reload();
  }
};

angular
  .module('EventsModule', ['ngDialog', 'ui.bootstrap', 'toastr', 'compareTo', 'akoenig.deckgrid', 'angular-cookie-law'])
  .directive('disableContents', function () {
    return {
      compile: function (tElem, tAttrs) {
        var inputs = tElem.find('input,select,textarea,button');
        inputs.not('[ng-disabled]').attr('ng-disabled', tAttrs['disableContents']);
        //for (var i = 0; i < inputs.length; i++) {
        //}
      }
    };
  })
  .directive('populateNames', function () {
    return function (scope, element, attrs) {
      element.change(function () {
        // Get the directive value and convert to array - then find the targest and
        // change them if they are blank
        var splits = element.val().split(' ');
        try {
          var targets = eval(attrs['populateNames']);
          $.each(targets, function () {
            var s = this.toString().split(':');
            var i;
            if (!isNaN(parseInt(s[1]))) {
              i = s[1];
            } else {
              if (s[1].toLowerCase() == 'last') {
                i = splits.length - 1;
              } else if (s[1].toLowerCase() == 'first') {
                i = 0;
              }
            }
            var $this = $('[name=' + s[0] + ']');
            if ($this.length > 0) {
              if ($this.val().length == 0) {
                //$this.val(splits[i])
                var ngModel = $this.attr('ng-model');
                var ng = ngModel.split('.');
                var scopeObj = scope;
                $.each(ng, function (x, n) {
                  if (x == ng.length - 1) {
                    scopeObj[this.toString()] = splits[i];
                    $this.val(splits[i]);
                    return false;
                  } else scopeObj = scopeObj[this.toString()];
                });
              }
            }
          });
        } catch (e) {
          console.log('Unable to action populateNames directive: ' + e);
        }
      });
    };
  })
  .factory('scroller', [
    'toastr',
    '$http',
    function (toastr, $http) {
      var scroller = {
        scroll: scroll,
        filter: filter
      };

      return scroller;

      /* Public API */

      /**
       * scroll
       * This function handles the scroll event on a page. It expects the following to
       * be available in context:
       * 		scope
       * 		dataProperty
       * 		urn
       * 		queryString
       *
       */
      function scroll() {
        var $scope = this.scope;
        if (!$scope.scrollDisabled) {
          var dataProperty = this.dataProperty;
          var urn = this.urn;
          var queryString = this.queryString;
          var augmentationFunction = this.augmentationFunction;

          // Use >= (not ==) if we want iPads to work
          if ($(window).scrollTop() + $(window).height() >= $(document).height()) {
            // Hit bottom
            $scope.scrollDisabled = true;
            $scope.scrollPage += 1;
            $scope.filterForm.criteria.page = $scope.scrollPage;
            $scope.filterForm.criteria.limit = $scope.initialLimit;
            filter($scope, dataProperty, urn, queryString, augmentationFunction, false, true, function (sailsResponse) {
              var data = sailsResponse.data[dataProperty] ? sailsResponse.data[dataProperty] : sailsResponse.data;
              if (data.length == 0) {
                // Out of data
                $scope.scrollPage -= 1;
              }
              // Change the filter criteria to match what we really have
              $scope.filterForm.criteria.limit = $scope.scrollPage * $scope.initialLimit;
              $scope.filterForm.criteria.page = $scope.initialPage;
              // Dummy get just to update the criteria server side
              var uri =
                urn +
                encodeURIComponent(JSON.stringify($scope.filterForm.criteria)) +
                '?nodata=1' +
                (queryString ? '&' + queryString : '');
              $http.get(uri);
              if (data.length > 0) {
                setTimeout(function () {
                  $scope.scrollDisabled = false;
                }, 500);
              }
            });
          }
        }
      }

      /**
       * filter
       *
       */
      function filter($scope, dataProperty, urn, queryString, augmentationFunction, paging, scrolling, cb) {
        if (paging) {
          $scope.filterForm.paging = true;
          $scope.initialLimit = $scope.filterForm.criteria.limit;
        } else {
          $scope.filterForm.loading = true;
        }
        $scope.loading = true;
        // Submit request to server.
        var uri =
          urn + encodeURIComponent(JSON.stringify($scope.filterForm.criteria)) + (queryString ? '?' + queryString : '');
        $http
          .get(uri)
          .then(function onSuccess(sailsResponse) {
            if (typeof sailsResponse.data == 'object') {
              // Check if there is a property matching the dataProperty
              // and use it of so - else assume it is just called "data"
              var data = sailsResponse.data[dataProperty] ? sailsResponse.data[dataProperty] : sailsResponse.data;
              if (augmentationFunction) {
                $scope[augmentationFunction](data);
              }
              if (scrolling) {
                // Add data to existing scope
                $scope[dataProperty] = $.merge($scope[dataProperty], data);
              } else {
                $scope[dataProperty] = data;
              }
              // Run callback if required
              if (cb && typeof cb == 'function') {
                cb(sailsResponse);
              } else {
                $scope.scrollDisabled = false;
              }
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
            $scope.filterForm.paging = false;
            $scope.loading = false;
          });
      }
    }
  ]);
