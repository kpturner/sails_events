angular.module('EventsModule', ['ngDialog', 'ui.bootstrap', 'toastr', 'compareTo', 'akoenig.deckgrid'])
		.directive('disableContents', function() {
		    return {
		        compile: function(tElem, tAttrs) {
		            var inputs = tElem.find('input,select,textarea,button');					
		            inputs.not("[ng-disabled]").attr('ng-disabled', tAttrs['disableContents']);
		            //for (var i = 0; i < inputs.length; i++) {
		            //}
		        }
		    }
		})
		.directive('populateNames',function(){
			return function(scope, element, attrs) {
		        element.change(function() {
					// Get the directive value and convert to array - then find the targest and 
					// change them if they are blank
					var splits=element.val().split(" ");
					try {
						var targets=eval(attrs['populateNames']);
						$.each(targets,function(){
							var s=this.toString().split(":");
							var i
							if (!isNaN(parseInt(s[1]))) {
								i=s[1];								
							}
							else {
								if (s[1].toLowerCase()=="last") {
									i=splits.length-1;	
								}
								else if (s[1].toLowerCase()=="first") {
									i=0;
								}	 
							}		
							var $this=$("[name="+s[0]+']');
							if ($this.length>0) {
								if ($this.val().length==0) {
									//$this.val(splits[i])
									var ngModel=$this.attr("ng-model");
									var ng=ngModel.split(".");
									var scopeObj=scope;
									$.each(ng,function(x,n){
										if (x==ng.length-1) {
											scopeObj[this.toString()]=splits[i];
											$this.val(splits[i]);  
											return false;
										}
										else
											scopeObj=scopeObj[this.toString()]
									})									
								}
							}
						})
					}
					catch(e) {
						console.log("Unable to action populateNames directive: "+e)
					}		           
		        });
		    };
		});	
 