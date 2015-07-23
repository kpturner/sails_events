angular.module('PrivateModule', ['ui.bootstrap', 'toastr', 'compareTo', 'akoenig.deckgrid'])
		.directive('disableContents', function() {
		    return {
		        compile: function(tElem, tAttrs) {
		            var inputs = tElem.find('input,select,textarea,button');
		            inputs.attr('ng-disabled', tAttrs['disableContents']);
		            for (var i = 0; i < inputs.length; i++) {
		            }
		        }
		    }
		});	
 