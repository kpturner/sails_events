/**
 * Apology.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    // Which event?
    event: {
      model: 'Event',
      required: true
    },

    // Who ?
    user: {
      model: 'User',
      required: true
    },

    // Message
    message: {
      type: 'text'
    }
  }
};
