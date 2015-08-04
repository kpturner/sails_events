/**
* Token.js
*
* @description :: Tokens for "remember me" strategy
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  
  // Enforce model schema in the case of schemaless databases
  schema: true,
  autoPK: false,

  attributes: {

    token: { 
      type: 'string', 
      primaryKey: true,
      unique: true,
	    required: true
    },
       
    user: {
      model: 'User',
      required: true
    }, 

  }
};

