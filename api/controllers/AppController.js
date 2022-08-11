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
			appUpdateRequested: true,
			mimicUserRequested: false
		});
	},

	/**
	 * Update application
	 *
	 * @param {Object} req
	 * @param {Object} res
	 */
	updateApp: function(req, res) {
		var cmd="sh "+require("path").join(process.cwd(),"gitupdate.sh");
		if (process.platform.substr(0,3)=="win") {
			// Windows!
			cmd=require("path").join(process.cwd(),"gitupdate.bat");
		}
		require("child_process").exec(
			cmd,
			//{
			//	cwd:process.cwd(),
			//	uid:process.getuid(),
			//	gid:process.getgid()
			//},
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
				// Let forever.js or docker restart us
				process.nextTick(function(){process.exit(0);});
			}
		);
	},

};

