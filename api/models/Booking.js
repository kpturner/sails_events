/**
 * Booking.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    // Who made the booking
    user: {
      model: "User",
      required: true,
    },

    // Which event?
    event: {
      model: "Event",
      required: true,
    },

    // Menu choice
    menuChoice: {
      type: "integer",
    },

    // Booking reference
    ref: {
      type: "string",
    },

    // Attending but not dining
    attendingOnly: {
      type: "boolean",
    },

    // The user's dietary requirements
    dietary: {
      type: "string",
    },

    // Places booked
    places: {
      type: "integer",
    },

    // Total cost
    cost: {
      type: "float",
      size: 15.2, // Decimal
    },

    amountPaid: {
      type: "float",
      size: 15.2, // Decimal
    },

    paid: {
      type: "boolean",
    },

    mop: {
      type: "string",
    },

    // Additional info
    info: {
      type: "text",
    },

    // Additional linked bookings
    additions: {
      collection: "LinkedBooking",
      via: "booking",
    },

    // Booking date
    bookingDate: {
      type: "date",
    },

    // Last payment reminder
    lastPaymentReminder: {
      type: "date",
    },

    // The user's dietary requirements
    carReg: {
      type: "string",
    },

    // Reminders sent (total)
    remindersSent: {
      type: "integer",
    },

    // Table no
    tableNo: {
      type: "integer",
    },

    // Created by
    createdBy: {
      model: "user",
    },

    // Online payment session id
    paymentSessionId: {
      type: "string",
    },

    // Online payment reference(s)
    paymentReference: {
      type: "text",
    },

    // Online refund reference(s)
    refundReference: {
      type: "text",
    },
  },
};
