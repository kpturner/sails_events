/**
 * LogController
 *
 * @description :: Server-side logic for managing masonic orders for a user
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */


module.exports = {
	
	/**
	 * Other orders
	 */	
	download:function(req, res) {

		var fileName="events-service.log";	 

		require("fs").readFile(require("path").join("logs",fileName), function (err, source) {
			if (err) {
				sails.log.error(err)
			}
			else {
				try {
					data=[];
					_.forEach(source.toString().split("\n"),function(l){
						if(l) {
							try {
								data.push(JSON.parse(l))
							}
							catch(e) {
								// Meh!
							}
						}
					})
					Utility.sendCsv(req, res, data)
				} catch (e) {
					sails.log.error(e)
				}
			}			
		});		
		
	},
	
     


};

