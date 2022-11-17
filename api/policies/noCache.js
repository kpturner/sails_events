module.exports = function (req, res, next) {
    //sails.log.info("Applying disable cache policy");
	//console.log("Applying disable cache policy");
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    try {
      next();
    } catch (err) {
      sails.log.debug(err);
      throw 'Unexpected error occurred';
    }
};
