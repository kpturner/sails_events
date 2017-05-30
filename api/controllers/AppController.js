/**
 * AppController
 *
 * @description :: Server-side logic for managing Apologies
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
	/**
	 * Update application confirmation
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	updateAppConfirmation: function(req, res) {
		res.view('dashboard',{			
			appUpdateRequested: true
		});  		
	}, 
	
	/** 
	 * Update application
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	updateApp: function(req, res) {
		require("child_process").exec(
			//require("path").join(process.cwd(),"gitupdate.sh"),
			require("path").join(process.cwd(),"ls"),
			{
				cwd:process.cwd()
			},
			function(err,stdout,stderr){
				if (err) {
					sails.log.error(err);
					return;
				}
				if (stdout) {
					sails.log.info(stdout)
				}
				if (stderr) {
					sails.log.error(stderr)
				}
				// Let forever.js restart us
				process.exit(0);
			}
		);				
	}, 
	
};

