/**
 * BookingController
 *
 * @description :: Server-side logic for managing bookings
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

    /**
     * Payment Deadline
     */
    paymentDeadline: function (event, booking) {
        // Booking payment deadline
        var df = require("dateformat");
        var deadline = "N/A";
        if (event.grace && event.grace > 0 && !booking.paid) {
            var dl = new Date(booking.bookingDate);
            var ed = new Date(event.date);
            dl.setDate(dl.getDate() + event.grace);
            // Don't go beyond closing date
            if (dl.getTime() > ed.getTime()) {
                dl = ed;
            }
            //dl=dl.toString();
            //deadline=dl.substr(0,dl.indexOf(":")-2);
            deadline = df(dl, "ddd, mmm dS, yyyy");
        }
        return deadline;
    },

    /**
     * Booking criteria
     */
    criteria: function (req) {
        var criteria = req.session.bookingCriteria;
        if (criteria) {
            criteria = JSON.parse(criteria)
        }
        else {
            criteria = {}
        }
        if (!criteria.page) {
            criteria.page = 1;
        }
        if (!criteria.limit) {
            criteria.limit = 50;
        }
        if (!criteria.filter) {
            criteria.filter = "";
        }
        return criteria;
    },

    /**
     * My bookings
     *
     * @param {Object} req
     * @param {Object} res
     */
    myBookings: function (req, res) {
        req.session.myBookings = true;
        req.session.userBookings = false;
        req.session.eventBookings = false;
        res.locals.event = {};
        res.locals.selectedUser = {};
        res.view('bookings', {
            criteria: sails.controllers.booking.criteria(req),
            myBookings: true,
            eventBookings: false,
            userBookings: false,
            viewOnly: false,
            errors: req.flash('error')
        });
    },

    /**
     * Event bookings
     *
     * @param {Object} req
     * @param {Object} res
     */
    eventBookings: function (req, res) {
        req.session.myBookings = false;
        req.session.eventBookings = true;
        req.session.userBookings = false;
        res.locals.selectedUser = {};
        Event.findOne(req.param("eventid")).populate("organiser").populate("organiser2").exec(function (err, event) {
            res.locals.event = Utility.sanitiseEventDates(event);
            res.view('bookings', {
                criteria: sails.controllers.booking.criteria(req),
                myBookings: false,
                eventBookings: true,
                userBookings: false,
                viewOnly: req.param("viewonly") || false,
                errors: req.flash('error')
            });
        })
    },

    /**
     * User bookings
     *
     * @param {Object} req
     * @param {Object} res
     */
    userBookings: function (req, res) {
        req.session.myBookings = false;
        req.session.eventBookings = false;
        req.session.userBookings = true;
        res.locals.event = {};
        User.findOne(req.param("userid")).exec(function (err, user) {
            if (err) {
                return res.negotiate(err);
            }
            res.locals.selectedUser = user;
            res.view('bookings', {
                criteria: sails.controllers.booking.criteria(req),
                myBookings: false,
                eventBookings: false,
                userBookings: true,
                viewOnly: false,
                errors: req.flash('error')
            });
        })
    },

    /**
     * Add permanent diners
     */
    addPD: function (req, res) {
        var eventId = req.param("eventid");
        //sails.log.debug("Adding permanent diners for event "+eventId);
        // Find all permanent diners
        Event.findOne(eventId).exec(function (err, event) {
            if (err) {
                return res.negotiate(err);
            }
            User.find({ isPD: true }).exec(function (err, users) {
                if (err) {
                    sails.log.error(err);
                    return res.negotiate(err);
                }
                // Filter out users already booked in
                async.each(users, function (user, next) {
                    Booking.findOne({ event: eventId, user: user.id })
                        .then(function (b) {
                            if (!b) {
                                // Not booked in so create booking now
                                b = {};
                                b.user = user.id;
                                b.event = eventId;
                                b.dietary = user.dietary;
                                b.places = 1;
                                b.cost = event.price;
                                b.amountPaid = 0;
                                b.paid = false;
                                b.mop = null;
                                b.info = null;
                                b.bookingDate = new Date();
                                b.createdBy = req.user.id;
                                Event.incrementLastBookingRef(eventId, function (err, updatedEvent) {
                                    if (!err) {
                                        b.ref = updatedEvent.code + updatedEvent.lastBookingRef.toString()
                                        Booking.create(b).exec(function () {
                                            next();
                                        })
                                    }
                                    else {
                                        next(err)
                                    }
                                })
                            }
                            else {
                                next()
                            }
                        })
                        .catch(function (err) {
                            next(err)
                        })
                },
                    function (err) {
                        if (err) {
                            sails.log.error(err);
                            return res.negotiate(err);
                        }
                        else {
                            return res.ok();
                        }
                    })
            })
        })

    },

    /**
     * Prepare data for booking
     */
    prepareBooking: function (req, res) {

        var eventId = req.param("eventid");
        var bookingId = req.param("bookingid");
        var userId = req.param("userid");
        var selectedUserId = req.param("selecteduserid"); //Only populated when an admin is making a booking on behalf of someone else
        var action = req.param("action");
        var mode = req.param("mode") ? req.param("mode") :
            (selectedUserId && !bookingId) ? "create" : "edit";
        if (action) {
            mode = action.substr(0, 1).toUpperCase() + action.substr(1);
        }
        var myBookings = (req.param("mybookings")) ? true : false;
        var eventBookings = (req.param("eventbookings")) ? true : false;
        var userBookings = (req.param("userbookings")) ? true : false;

        // Private function to process the initiation
        var initialiseBooking = function (event, existingBooking) {
            // Now we have to adjust capacity by the number of places booked so far
            var places = 0;
            var criteria = {};
            criteria.event = event.id;

            var preparedBooking = function (userForBooking, criteria) {
                var potentialDuplicates = [];
                Booking.find(criteria).populate("user").populate("additions", { sort: { seq: 'asc' } }).exec(function (err, bookings) {
                    if (!err) {
                        bookings.forEach(function (booking, index) {
                            places += booking.places
                            // Look for potential duplicates
                            if (!sails.config.events.multipleBookings && userForBooking) {
                                booking.additions.forEach(function (addition, a) {
                                    if (
                                        addition.surname && userForBooking.surname && addition.surname.toLowerCase() == userForBooking.surname.toLowerCase()
                                        && addition.firstName && userForBooking.firstName && addition.firstName.toLowerCase() == userForBooking.firstName.toLowerCase()
                                    ) {
                                        if (!addition.lodge || (addition.lodge && userForBooking.lodge && addition.lodge.toLowerCase() == userForBooking.lodge.toLowerCase())) {
                                            addition.host = booking.user;
                                            potentialDuplicates.push(addition)
                                        }
                                    }
                                })
                            }
                        })


                    }

                    res.locals.event = Utility.sanitiseEventDates(event);
                    // Remember that mysql adaptor will very unhelpfully adjust the date for DST so use a utility to get UTC date
                    if (event.openingDate) {
                        res.locals.event.UTCOpeningDate = Utility.UTCDBdate(event.openingDate);
                    }
                    if (event.closingDate) {
                        res.locals.event.UTCClosingDate = Utility.UTCDBdate(event.closingDate);
                    }
                    // Obscure some fields!
                    if (res.locals.event.bypassCode)
                        res.locals.event.bypassCode = "*redacted";
                    res.locals.now = Utility.UTCDBdate(Utility.today());
                    var now = new Date();
                    res.locals.nowHH = now.getHours();
                    res.locals.nowMM = now.getMinutes();
                    res.locals.nowSS = now.getSeconds();
                    res.locals.event.capacity -= places;
                    if (res.locals.event.capacity < 0) {
                        res.locals.event.capacity = 0;
                    }
                    res.locals.booking = existingBooking;
                    res.locals.isAdmin = existingBooking ? Utility.isAdmin(req.user, existingBooking.event) : false;
                    res.locals.myBookings = myBookings;
                    res.locals.eventBookings = eventBookings;
                    res.locals.userBookings = userBookings;
                    res.locals.mops = sails.config.events.mops;
                    res.locals.selectedUserId = (selectedUserId) ? selectedUserId : "";
                    res.locals.areas = Utility.areas();
                    res.locals.centres = Utility.centres();
                    res.locals.potentialDuplicates = potentialDuplicates;
                    res.locals.lodgeMandatory = sails.config.events.lodgeMandatory;

                    // Get the data for the event and the user and then navigate to the booking view
                    if (req.wantsJSON)
                        return res.json({
                            model: 'booking',
                            mode: mode
                        });
                    else
                        return res.view("book", {
                            model: 'booking',
                            mode: mode
                        });
                })
            }

            // Return prepared booking
            if (existingBooking) {
                criteria.id = { "!": existingBooking.id } // Exclude the existing booking details from the calcs
                existingBooking.deadline = sails.controllers.booking.paymentDeadline(event, existingBooking);
                if (mode == "create") {
                    mode = "edit"
                }
                return preparedBooking(existingBooking.user, criteria);
            }
            else {
                if (selectedUserId) {
                    User.findOne(selectedUserId)
                        .then(function (userForBooking) {
                            return preparedBooking(userForBooking, criteria);
                        })
                }
                else {
                    if (eventBookings) {
                        return preparedBooking(null, criteria);
                    }
                    else {
                        return preparedBooking(res.locals.user, criteria);
                    }
                }
            }

        }


        // User bookings must simply go to a look-a-like of the dashboard, but with a pre-selected user
        if (userBookings && userId) {
            User.findOne(userId).exec(function (err, user) {
                if (err) {
                    return res.negotiate(err);
                }
                return res.view("userBookings", {
                    selectedUser: user
                })
            })
        }
        else {
            // If we have a booking id then we are editing the booking from either MyBookings or the admin booking maintenance
            // as opposed to the public dashboard
            if (bookingId) {
                Booking.findOne(bookingId).populate('user').exec(function (err, existingBooking) {
                    if (err) {
                        return res.genericErrorResponse('470', 'This booking no longer exists!')
                    }
                    else {
                        if (!existingBooking) {
                            return res.view('events', {
                                filter: req.session.eventFilter,
                                errors: req.flash('error')
                            });
                        }
                        Event.findOne(existingBooking.event).populate("organiser").populate("organiser2").exec(function (err, event) {
                            if (err) {
                                return res.negotiate(err);
                            }
                            if (!event) {
                                return res.negotiate(new Error("No event found for id " + existingBooking.event));
                            }
                            initialiseBooking(event, existingBooking);
                        })
                    }
                })
            }
            else {
                Event.findOne(eventId).populate('organiser').populate("organiser2").exec(function (err, event) {
                    if (err) {
                        return res.negotiate(err);
                    }
                    if (!event) {
                        return res.negotiate(new Error("No event found for id " + eventId));
                    }
                    // Create or edit/delete mode?
                    if (action == "create") {
                        initialiseBooking(event);
                    }
                    else {
                        // Has the user already made this booking?  If multiple bookings are allowed, we don't care (treat it as a new booking)
                        if (!sails.config.events.multipleBookings) {
                            var userId = (selectedUserId) ? selectedUserId : req.user.id;
                            Booking.findOne({
                                event: eventId,
                                user: userId
                            }).populate('user').exec(function (err, existingBooking) {
                                // if there is already a booking for this user the called function will get it, otherwise it will get nada
                                initialiseBooking(event, existingBooking);
                            })
                        }
                        else {
                            initialiseBooking(event);
                        }
                    }
                })
            }
        }

    },

    /**
     * Order label
     */
    orderLabel: function (order) {
        // Order label
        var orderLabel;
        if (order && order != "C") {
            sails.config.events.orders.forEach(function (cfg) {
                if (order == cfg.code) {
                    orderLabel = (cfg.label) ? cfg.label : "Lodge";
                    return false;
                }
            })
            if (!orderLabel) {
                orderLabel = "Lodge";
            }
        }
        else {
            orderLabel = "Lodge";
        }
        return orderLabel;
    },

    /**
     * Set email info
     */
    setEmailInfo: function (event, user, orders) {
        if (event.order && event.order != "C") {
            _.forEach(orders, function (order) {
                if (event.order == order.code) {
                    user.lodge = order.name;
                    user.lodgeNo = order.number;
                    user.lodgeYear = order.year;
                    user.salutation = order.salutation;
                    user.rank = order.rank;
                    user.centre = order.centre;
                    user.area = order.area;
                    return false;
                }
            })
        }
    },

    /**
     * Booking confirmation email
     */
    bookingConfirmationEmail: function (opts) {

        var recipientName = opts.recipientName;
        var subject = opts.subject;
        var from = opts.from;
        var to = opts.to;
        var cc = opts.cc;
        var bcc = opts.bcc;
        var user = opts.user;
        var event = opts.event;
        var booking = opts.booking;
        var updated = opts.updated;
        var orderLabel = opts.orderLabel;
        var deadline = opts.deadline;
        var formattedDate = opts.formattedDate;
        var linkedBookings = opts.linkedBookings;
        var bookingRef = opts.bookingRef;
        var menu = "n/a";
        if (event.menu) {
            menu = event.menu;
            if (booking.menuChoice === 2) {
                menu = event.menu2;
            } else {
                if (booking.menuChoice === 3) {
                    menu = event.menu3;
                } else {
                    if (booking.menuChoice === 4) {
                        menu = event.menu4;
                    }
                }
            }
        }

        Email.send(
            "bookingConfirmation",
            {
                recipientName: recipientName,
                senderName: sails.config.events.title,
                updated: updated,
                regInterest: event.regInterest,
                orderLabel: orderLabel,
                lodgeYearLabel: sails.config.events.lodgeYearLabel || (orderLabel + " year"),
                eventFree: event.free,
                eventName: event.name,
                eventDate: formattedDate,
                eventTime: event.time,
                eventAdditionalInfo: event.additionalInfo,
                eventVenue: event.venue.replace(/[\n\r]/g, '<br>'),
                eventOrganiser: event.organiser.name,
                organiserEmail: event.organiser.email,
                organiserContactNo: event.organiser.phone || "",
                eventBlurb: (event.blurb || "n/a").replace(/[\n\r]/g, '<br>'),
                menuChoice: booking.menuChoice,
                eventMenu: menu.replace(/[\n\r]/g, '<br>'),
                eventDressCode: (event.dressCode || "n/a").replace(/[\n\r]/g, '<br>'),
                email: user.email,
                salutation: user.salutation || "",
                firstName: user.firstName || "",
                surname: user.surname || "",
                category: user.category || "",
                addressReqd: event.addressReqd,
                address1: user.address1 || "",
                address2: user.address2 || "",
                address3: user.address3 || "",
                address4: user.address4 || "",
                postcode: user.postcode || "",
                phone: user.phone || "",
                lodge: user.lodge || "",
                lodgeNo: user.lodgeNo || "",
                lodgeYear: user.lodgeYear || "",
                centre: user.centre || "",
                area: user.area || "",
                rank: user.rank || "",
                voReqd: event.voReqd,
                isVO: user.isVO,
                voLodge: user.voLodge || "",
                voLodgeNo: user.voLodgeNo || "",
                voCentre: user.voCentre || "",
                voArea: user.voArea || "",
                dietary: user.dietary || "",
                bookingRef: bookingRef,
                info: (booking.info || "n/a").replace(/[\n\r]/g, '<br>'),
                places: booking.places,
                paid: booking.paid,
                linkedBookings: linkedBookings,
                paymentDetails: (event.paymentDetails || "n/a").replace(/[\n\r]/g, '<br>').replace(new RegExp('<%BOOKINGREF%>', 'g'), bookingRef),
                total: (booking.places * event.price),
                deadline: deadline,
            },
            {
                from: from,
                to: to,
                cc: cc,
                bcc: bcc,
                subject: subject
            },
            function (err) {
                Utility.emailError(err);
            }
        )
    },

    /**
     * Make booking
     */
    makeBooking: function (req, res) {

        var eventId = req.param("eventid");
        var bookingId = req.param("bookingId");
        var action = req.param("action");
        var selectedUserId = req.param("selecteduserid");
        var bookingRef = null;
        var lodgeRoomArr = [];

        Event.findOne(eventId).populate("organiser").populate("organiser2").exec(function (err, event) {
            if (err) {
                return res.negotiate(err);
            }

            // Order label
            var orderLabel = sails.controllers.booking.orderLabel(event.order);

            // Update the user profile
            var user = {};

            // Careful with the user lodge details. This depends on the order
            // for the event
            if (!event.order || event.order == "C") {
                // Craft
                user.salutation = req.param("salutation");
                user.lodge = req.param("lodge");
                user.lodgeNo = req.param("lodgeNo");
                user.lodgeYear = req.param("lodgeYear");
                user.centre = req.param("centre");
                user.area = req.param("area");
                user.rank = req.param("rank");
            }
            user.name = req.param("name");
            user.surname = req.param("surname");
            user.firstName = req.param("firstName");
            user.category = req.param("category");
            user.isVO = req.param("isVO");
            user.voLodge = req.param("voLodge");
            user.voLodgeNo = req.param("voLodgeNo");
            user.voCentre = req.param("voCentre");
            user.voArea = req.param("voArea");
            user.dietary = req.param("dietary");
            user.email = req.param("email");
            user.address1 = req.param("address1");
            user.address2 = req.param("address2");
            user.address3 = req.param("address3");
            user.address4 = req.param("address4");
            user.postcode = req.param("postcode");
            if (req.param("phone"))
                user.phone = req.param("phone");
            var linkedBookings = req.param("linkedBookings");

            // Sort out linked bookings/placeholders
            var ph = 0;
            _.forEach(linkedBookings, function (lb, l) {
                if (lb.surname.toLowerCase() == "*placeholder*") {
                    ph++;
                    lb.firstName = (ph).toString();
                }
            })

            /**
             * Private function to create booking
             */
            var bookIt = function (userId, existingBooking) {
                User.update(userId, user).exec(
                    function (err, users) {
                        if (err) {
                            sails.log.error(err);
                            // If this is a uniqueness error about the email attribute,
                            // send back an easily parseable status code.
                            if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0]
                                && err.invalidAttributes.email[0].rule === 'unique') {
                                return res.genericErrorResponse(409, "Email address is already in use");
                            }
                            return res.negotiate(err);
                        }

                        // User updated
                        user = users[0];
                        if (!req.session.eventBookings && !req.session.userBookings) {
                            req.user = users[0];
                            res.locals.user = req.user;
                        }


                        Order.find({ user: userId }).exec(function (err, orders) {
                            // Before making the booking, make doubly sure we have capacity
                            var places = 0;
                            var criteria = {};
                            criteria.event = eventId;
                            if (bookingId) {
                                criteria.id = { "!": bookingId } // Exclude the existing booking details from the calcs
                            }
                            Booking.find(criteria).exec(function (err, bookings) {
                                if (!err) {
                                    bookings.forEach(function (booking, index) {
                                        places += booking.places
                                    })
                                }
                                event.capacity -= places;

                                // Capacity must exceed (at least) places requested
                                if (event.capacity >= req.param("places")) {

                                    // Private function to process booking
                                    var processBooking = function () {
                                        let booking = {};
                                        let balance;
                                        let refund;
                                        if (existingBooking) {
                                            _.extend(booking, existingBooking);
                                        }
                                        else {
                                            booking.createdBy = req.user.id;
                                            booking.bookingDate = new Date();
                                        }
                                        booking.user = user.id;
                                        booking.event = eventId;
                                        booking.menuChoice = req.param("menuChoice") || 1;
                                        if (booking.menuChoice > event.menusOnOffer || booking.menuChoice < 0) {
                                            booking.menuChoice = 1;
                                        }
                                        booking.info = req.param("info");
                                        if (req.param("places")) {
                                            booking.places = req.param("places")
                                        }
                                        else {
                                            booking.places = 1
                                        }
                                        booking.cost = booking.places * event.price;
                                        booking.dietary = user.dietary;

                                        if (req.session.eventBookings || req.session.userBookings) {
                                            booking.amountPaid = req.param("amountPaid");
                                            booking.paid = req.param("paid");
                                            booking.mop = req.param("mop");
                                            booking.tableNo = req.param("tableNo");
                                        }
                                        else {
                                            if (!existingBooking) {
                                                // New booking
                                                booking.amountPaid = 0;
                                                booking.paid = false;
                                                booking.mop = null;
                                                booking.tableNo = null;
                                            }
                                            else {
                                                // Existing booking - has the amount owed changed for a paid booking?
                                                if (booking.paid && existingBooking.places != booking.places) {
                                                    balance = (booking.places - existingBooking.places) * event.price;
                                                    refund = (balance <= 0) ? (balance * -1) : 0;
                                                    balance = (balance <= 0) ? null : balance;
                                                    booking.paid = false;
                                                }
                                                else {
                                                    if (!booking.paid && booking.amountPaid && booking.cost == booking.amountPaid) {
                                                        booking.paid = true;
                                                    } else {
                                                      balance = booking.cost - booking.amountPaid;
                                                      booking.paid = false;
                                                    }
                                                }
                                            }
                                        }

                                        //console.log(bookingRef)

                                        // Use pre-existing booking ref if it exists
                                        if (bookingRef)
                                            booking.ref = bookingRef;


                                        Booking.create(booking, async function (err, booking) {
                                            if (err) {
                                                sails.log.error(err);
                                                return res.negotiate(err);
                                            }

                                            // Update and persist lodge room array for new bookings
                                            if (!existingBooking && lodgeRoomArr.length > 0) {
                                                _.forEach(lodgeRoomArr, function (lr, l) {
                                                    lodgeRoomArr[l].booking = booking.id
                                                })
                                                LodgeRoom.create(lodgeRoomArr).exec(function () { })
                                            }

                                            // Create linked bookings
                                            if (linkedBookings) {
                                                linkedBookings.forEach(function (linkedBooking, index) {
                                                    linkedBooking.booking = booking.id;
                                                    linkedBooking.seq = index + 1;
                                                    if (!linkedBooking.rank)
                                                        linkedBooking.rank = ""
                                                    if (!linkedBooking.dietary)
                                                        linkedBooking.dietary = ""
                                                    if (!linkedBooking.lodge)
                                                        linkedBooking.lodge = ""
                                                    if (!linkedBooking.lodgeNo)
                                                        linkedBooking.lodgeNo = ""
                                                    if (!linkedBooking.lodgeYear)
                                                        linkedBooking.lodgeYear = ""
                                                    if (!linkedBooking.area)
                                                        linkedBooking.area = ""
                                                    if (!linkedBooking.centre)
                                                        linkedBooking.centre = ""
                                                    if (!linkedBooking.menuChoice) {
                                                        linkedBooking.menuChoice = 1;
                                                    }
                                                    if (linkedBooking.menuChoice > event.menusOnOffer || booking.menuChoice < 0) {
                                                        linkedBooking.menuChoice = 1;
                                                    }
                                                    //LinkedBooking.create(linkedBooking).exec(function(err,lb){
                                                    //	if (err)
                                                    //		console.log(err)
                                                    //})
                                                })
                                                LinkedBooking.create(linkedBookings).exec(function (err, lb) {
                                                    if (err) {
                                                        sails.log.error(err);
                                                    }
                                                    else {
                                                        if (existingBooking) {
                                                            existingBooking.additions = linkedBookings;
                                                            existingBooking.user = user;
                                                            lodgeRoom(existingBooking);
                                                        }
                                                    }
                                                })
                                            }


                                            var finalise = function () {
                                                // If the user has previously sent an apology, delete it
                                                Apology.destroy({ event: booking.event, user: booking.user }).exec(function (err, deleted) {
                                                    if (!err) {
                                                        //console.log(deleted)
                                                    }
                                                })

                                                // If this is the user making a booking, send them a confirmation email.
                                                // Also send an email when the event changes to "paid" and when an
                                                // organiser makes a new booking for somebody
                                                var sendEmail = false;
                                                if (user.email) {
                                                    if (!req.session.eventBookings && !req.session.userBookings) {
                                                        sendEmail = true;
                                                    }
                                                    else {
                                                        if (!existingBooking) {
                                                            // It is new
                                                            sendEmail = true;
                                                        }
                                                        else {
                                                            if (!existingBooking.paid && booking.paid) {
                                                                // Paid flag changed
                                                                sendEmail = true;
                                                            }
                                                        }
                                                    }
                                                }
                                                if (sendEmail) {
                                                    var formattedDate = event.date.toString();
                                                    formattedDate = formattedDate.substr(0, formattedDate.indexOf("00:00:00"));

                                                    // Booking payment deadline
                                                    var deadline = sails.controllers.booking.paymentDeadline(event, booking);

                                                    var updated = "";
                                                    var subject = "";
                                                    if (!event.regInterest) {
                                                        subject = "Event booking confirmation";
                                                    }
                                                    else {
                                                        subject = "Event interest confirmation";
                                                    }
                                                    if (bookingId) {
                                                        updated = ' has been updated';
                                                        if (event.regInterest) {
                                                            subject = 'Event interest update confirmation'
                                                        }
                                                        else {
                                                            subject = 'Event booking update confirmation'
                                                        }
                                                    }

                                                    if (!existingBooking && booking.paid) {
                                                        updated += ". It has been flagged as PAID";
                                                    }
                                                    else if (existingBooking && !existingBooking.paid && booking.paid) {
                                                        // Paid flag changed
                                                        updated += " and flagged as PAID";
                                                    }
                                                    else {
                                                        // Is there a balance to pay?
                                                        if (balance) {
                                                            updated += " and there is a balance to pay of £" + balance;
                                                        } else {
                                                          if (refund) {
                                                            updated += " and there is a refund dur of £" + refund;
                                                          }
                                                        }
                                                    }

                                                    sails.controllers.booking.setEmailInfo(event, user, orders);

                                                    var emailOpts = {
                                                        recipientName: Utility.recipient(user.salutation, user.firstName, user.surname),
                                                        subject: subject,
                                                        from: event.name + ' <' + sails.config.events.email + '>',
                                                        to: user.email,
                                                        bcc: sails.controllers.booking.bookingBCC(booking, [event.organiser, event.organiser2, sails.config.events.developer]),
                                                        user: user,
                                                        event: event,
                                                        booking: booking,
                                                        updated: updated,
                                                        orderLabel: orderLabel,
                                                        deadline: deadline,
                                                        formattedDate: formattedDate,
                                                        linkedBookings: linkedBookings,
                                                        bookingRef: bookingRef,
                                                    }
                                                    sails.controllers.booking.bookingConfirmationEmail(emailOpts);
                                                }

                                                // Return to caller with complete booking info
                                                return res.json(booking);

                                            }

                                            // If we don't have a booking ref, create and update now.
                                            // Why on earth are we doing this now rather than before we create the
                                            // booking??  You may well ask - but the reason is that prior to
                                            // creating the Event.incrementLastBookingRef function, we used the
                                            // incrementally generated key to the new booking (the "id") in the
                                            // booking reference, so we had to create the booking first.
                                            // The code is still in the same place so that we can fall back to that
                                            // method if the new atomic function fails for some reason (paranoia)
                                            if (!bookingRef) {
                                                Event.incrementLastBookingRef(event.id, function (err, updatedEvent) {
                                                    if (!err) {
                                                        bookingRef = updatedEvent.code + updatedEvent.lastBookingRef.toString()
                                                    }
                                                    else {
                                                        // Use the original event object as the update failed
                                                        bookingRef = event.code + booking.id.toString();
                                                        // Email developer for comfort
                                                        try {
                                                            if (sails.config.events.developer) {
                                                                Email.send(
                                                                    "diagnostic",
                                                                    {
                                                                        err: "Booking id resorted to original method " + bookingRef
                                                                    },
                                                                    {
                                                                        to: sails.config.events.developer,
                                                                        subject: "Booking id resorted to original method " + bookingRef
                                                                    },
                                                                    function () { }
                                                                )
                                                            }
                                                        }
                                                        catch (e) { }
                                                    }
                                                    // Update the booking ref
                                                    Booking.update(booking.id, { ref: bookingRef }).exec(function () {
                                                        booking.ref = bookingRef;

                                                        // If we are using online payments, add a checkout session id to the booking
                                                        // But only if this is a registered user booking themselves in.
                                                        if (user.authProvider !== 'dummy' && event.onlinePayments && event.onlinePaymentConfig && !booking.paid) {
                                                          sails.controllers.payment.getNewCheckoutSession(booking.id)
                                                            .then((sessionId) => {
                                                                const paymentConfig = sails.config.events.onlinePaymentPlatforms[event.onlinePaymentPlatform]
                                                                    .find(config => config.code === event.onlinePaymentConfig);
                                                                Booking.update(booking.id, { paymentSessionId: sessionId }).exec(() => {
                                                                    booking.stripePublishableKey = paymentConfig.publishableKey;
                                                                    booking.paymentSessionId = sessionId;
                                                                    // Finalise booking
                                                                    finalise();
                                                                });
                                                            })
                                                            .catch((err) => {
                                                                return res.genericErrorResponse("455", "Booking failed. Unable to create a payment session")
                                                            })
                                                        } else {
                                                            // Finalise booking
                                                            finalise();
                                                        }
                                                    });
                                                })
                                            }
                                            else {
                                              // Are we using online payments?
                                              if (user.authProvider !== 'dummy' && event.onlinePayments && event.onlinePaymentConfig) {
                                                // Do we have a balance?
                                                if (balance) {
                                                  sails.controllers.payment.getNewCheckoutSession(booking.id)
                                                      .then((sessionId) => {
                                                        if (sessionId) {
                                                          const paymentConfig = sails.config.events.onlinePaymentPlatforms[event.onlinePaymentPlatform]
                                                              .find(config => config.code === event.onlinePaymentConfig);
                                                          Booking.update(booking.id, { paymentSessionId: sessionId }).exec(() => {
                                                              booking.stripePublishableKey = paymentConfig.publishableKey;
                                                              booking.paymentSessionId = sessionId;
                                                              // Finalise booking
                                                              finalise();
                                                          });
                                                        } else {
                                                          finalise();
                                                        }
                                                      })
                                                      .catch((err) => {
                                                          return res.genericErrorResponse("455", "Booking failed. Unable to create a payment session")
                                                      })
                                                } else {
                                                  // Or a refund?
                                                  if (refund && booking.paymentReference) {
                                                    await sails.controllers.payment.issueRefund(booking, refund);
                                                    finalise();
                                                  } else {
                                                    finalise();
                                                  }
                                                }
                                              } else {
                                                // Finalise booking
                                                finalise();
                                              }
                                            }
                                        })
                                    }

                                    function lodgeRoom(existingBooking, cb) {
                                        // If we don't have a booking id its a simple case of writing out the details as they are
                                        if (!existingBooking) {
                                            var lr = {
                                                event: eventId,
                                                salutation: user.salutation,
                                                surname: user.surname,
                                                firstName: user.firstName,
                                                rank: user.rank,
                                                cancelled: false,
                                            }
                                            lodgeRoomArr.push(lr);
                                            _.forEach(linkedBookings, function (lb, l) {
                                                var lr = {
                                                    event: eventId,
                                                    salutation: lb.salutation,
                                                    surname: lb.surname,
                                                    firstName: lb.firstName,
                                                    rank: lb.rank,
                                                    cancelled: false,
                                                }
                                                lodgeRoomArr.push(lr);
                                            })
                                            if (cb) cb();
                                        }
                                        else {
                                            // Get the existing lodge room data
                                            var elrd = [];
                                            existingMain = false;
                                            LodgeRoom.find({ event: eventId, booking: existingBooking.id }).exec(function (err, elrds) {
                                                if (!err && elrds) {
                                                    // Flag any that are no longer on the booking as cancelled
                                                    elrd = elrds;
                                                    _.forEach(elrd, function (elr, l) {
                                                        var found = false;
                                                        if (elr.surname.toLowerCase() == existingBooking.user.surname.toLowerCase() && elr.firstName.toLowerCase() == existingBooking.user.firstName.toLowerCase()) {
                                                            found = true;
                                                            existingMain = true;
                                                        }
                                                        else {
                                                            _.forEach(existingBooking.additions, function (eba, a) {
                                                                if (eba.surname.toLowerCase() == elr.surname.toLowerCase() && eba.firstName.toLowerCase() == elr.firstName.toLowerCase()) {
                                                                    found = true;
                                                                    return false;
                                                                }
                                                            })
                                                        }
                                                        if (!found) {
                                                            LodgeRoom.update(elr.id, { cancelled: true }).exec(function () { })
                                                        }
                                                        else {
                                                            LodgeRoom.update(elr.id, { cancelled: false }).exec(function () { })
                                                        }
                                                    })
                                                }
                                                // Add any that did not exist before
                                                if (!existingMain) {
                                                    var lr = {
                                                        event: eventId,
                                                        booking: existingBooking.id,
                                                        salutation: existingBooking.user.salutation,
                                                        surname: existingBooking.user.surname,
                                                        firstName: existingBooking.user.firstName,
                                                        rank: existingBooking.user.rank,
                                                        cancelled: false,
                                                    }
                                                    LodgeRoom.create(lr).exec(function () { })
                                                }
                                                _.forEach(existingBooking.additions, function (eba, a) {
                                                    var found = false;
                                                    _.forEach(elrd, function (elr, l) {
                                                        if (eba.surname.toLowerCase() == elr.surname.toLowerCase() && eba.firstName.toLowerCase() == elr.firstName.toLowerCase()) {
                                                            found = true;
                                                            return false;
                                                        }
                                                    })
                                                    if (!found) {
                                                        var lr = {
                                                            event: eventId,
                                                            booking: existingBooking.id,
                                                            salutation: eba.salutation,
                                                            surname: eba.surname,
                                                            firstName: eba.firstName,
                                                            rank: eba.rank,
                                                            cancelled: false,
                                                        }
                                                        LodgeRoom.create(lr).exec(function () { })
                                                    }
                                                })
                                                if (cb) cb();
                                            })
                                        }
                                    }


                                    // If we have an existing booking, zap it before making the new booking
                                    if (bookingId) {
                                        Booking.destroy(bookingId, function (err) {
                                            LinkedBooking.destroy({ booking: bookingId }, function (err) {
                                                processBooking();
                                            })
                                        })
                                    }
                                    else {
                                        lodgeRoom(null, processBooking);
                                    }


                                }
                                else {
                                    //No capacity!
                                    return res.genericErrorResponse("455", "Booking failed. The event does not have capacity for the places requested")
                                }

                            })
                        });
                    }
                )
            }

            /**
             *  Private function to check and create the booking
             */
            var checkAndbookIt = function (userId) {
                // If not Craft, update/create the users order details.
                // If the user is in two orders of the same type
                // we will ignore that and only cater for the first one
                if (event.order && event.order != "C") {
                    Order.destroy({ user: userId, code: event.order }).exec(function (err, deleted) {
                        var order = {
                            user: userId,
                            code: event.order,
                            salutation: req.param("salutation"),
                            name: req.param("lodge"),
                            number: req.param("lodgeNo"),
                            year: req.param("lodgeYear"),
                            centre: req.param("centre"),
                            area: req.param("area"),
                            rank: req.param("rank"),
                        }
                        Order.create(order).exec(function (err, newOrder) {
                            checked();
                        })
                    })
                }
                else {
                    checked();
                }

                function checked() {
                    // Check existing booking before continuing
                    Booking.findOne({
                        event: eventId,
                        user: userId
                    }).populate("additions").populate("user").exec(function (err, existingBooking) {
                        if (existingBooking) {
                            if (existingBooking.id == bookingId) {
                                // OK
                                return bookIt(userId, existingBooking);
                            }
                            else {
                                if (!sails.config.events.multipleBookings) {
                                    return res.genericErrorResponse("460", "Booking failed. This user is already booked in to the event")
                                }
                                else {
                                    // OK
                                    return bookIt(userId, existingBooking);
                                }
                            }
                        }
                        else {
                            // OK
                            return bookIt(userId);
                        }
                    })
                }


            }
            /********************************************* */

            // We need to decide if we are using the current user (normal booking) or if we
            // are in "create" mode where the user may or may not exist yet
            if (action == "create") {
                if (selectedUserId) {
                    // Administrator making booking on behalf of another user
                    checkAndbookIt(selectedUserId);
                }
                else {
                    // Does the user exist already (with this email address?)
                    if (user.email) {
                        User.findOne({ email: user.email }).exec(function (err, existingUser) {
                            if (err || !existingUser) {
                                // Create a dummy user for the booking
                                user.authProvider = "dummy";
                                User.create(user).exec(function (err, newUser) {
                                    if (err) {
                                        //!Ouch!
                                        sails.log.error('res.genericErrorResponse() :: Sending ' + err.code + ': ' + err.message + ' response');
                                        return res.genericErrorResponse("455", "Booking failed. Attempt to create new user failed!")
                                    }
                                    checkAndbookIt(newUser.id)
                                })
                            }
                            else {
                                checkAndbookIt(existingUser.id);
                            }
                        })
                    }
                    else {
                        // No email provided so we must create a dummy user regardless
                        user.authProvider = "dummy";
                        User.create(user).exec(function (err, newUser) {
                            if (err) {
                                //!Ouch!
                                sails.log.error('res.genericErrorResponse() :: Sending ' + err.code + ': ' + err.message + ' response');
                                return res.genericErrorResponse("455", "Booking failed. Attempt to create new user failed!")
                            }
                            checkAndbookIt(newUser.id)
                        })
                    }
                }
            }
            else {
                if (bookingId) {
                    // Rebook for existing user
                    Booking.findOne(bookingId).exec(function (err, booking) {
                        if (err || !booking) {
                            // Arrgh!
                            if (err) {
                                sails.log.error('res.genericErrorResponse() :: Sending ' + err.code + ': ' + err.message + ' response');
                                return res.genericErrorResponse("455", "Booking failed. Attempt to rebook failed!")
                            }
                            return res.genericErrorResponse("455", "Booking failed. Attempt to rebook failed!. Existing booking not found for " + bookingId)
                        }
                        else {
                            bookingRef = booking.ref;
                            checkAndbookIt(booking.user);
                        }
                    })
                }
                else {
                    // Book for current user
                    checkAndbookIt(res.locals.user.id);
                }
            }



        })

    },


    /**
     * Validate additional bookings in case they are duplicates
     *
     */
    validateAdditions: function (req, res) {

        var bookingId = req.param("bookingId")
        var linkedBookings = req.param("linkedBookings");
        var eventId = req.param("eventId")
        var where = {};
        where.event = eventId;
        if (bookingId) {
            where.id = { "!": bookingId }
        }
        // Now we want a list of additional bookings that are recorded against this
        // event, excluding those from this particular booking
        var duplicates = [];
        Booking.find(where).populate('user').populate("additions")
            .exec(function (err, bookings) {
                if (err) {
                    console.log(err)
                }
                // Traverse the bookings and analyse each additional booking
                if (bookings) {
                    bookings.forEach(function (booking, b) {
                        // Check the main bookee first
                        linkedBookings.forEach(function (ob, m) {
                            if (ob.surname.toLowerCase() != "*placeholder*") {
                                if (booking.user) {
                                    if (
                                        booking.user.surname.toLowerCase() == ob.surname.toLowerCase()
                                        && booking.user.firstName.toLowerCase() == ob.firstName.toLowerCase()
                                    ) {
                                        if (!booking.user.lodge || (booking.user.lodge && ob.lodge && booking.user.lodge.toLowerCase() == ob.lodge.toLowerCase()))
                                            duplicates.push(ob)
                                    }
                                }
                            }
                        })
                        // Additions
                        booking.additions.forEach(function (lb, l) {
                            if (lb.surname.toLowerCase() != "*placeholder*") {
                                // Possible duplicate?
                                linkedBookings.forEach(function (ob, m) {
                                    if (
                                        lb.surname.toLowerCase() == ob.surname.toLowerCase()
                                        && lb.firstName.toLowerCase() == ob.firstName.toLowerCase()
                                    ) {
                                        if (!lb.lodge || (lb.lodge && ob.lodge && lb.lodge.toLowerCase() == ob.lodge.toLowerCase()))
                                            duplicates.push(ob)
                                    }
                                })
                            }
                        })
                    })
                }
                return res.json(duplicates)
            })

    },

    /**
     * Get all my bookings
     *
     * @param {Object} req
     * @param {Object} res
     */
    allMyBookings: function (req, res) {

        var criteria = req.param('criteria');
        if (criteria) {
            try {
                criteria = JSON.parse(criteria)
            }
            catch (e) {
                criteria = {}
            }
        }
        else {
            criteria = {}
        }
        req.session.bookingCriteria = JSON.stringify(criteria);
        req.session.userCriteria = "{}";

        // Special case for no data
        if (req.param("nodata") == "1") {
            return res.json({});
        }


        var download = req.param('download');

        var where = {};
        where.user = req.user.id;
        var pag = {
            "page": (criteria.page || 1),
            "limit": (criteria.limit || 50)
        }
        var filter = criteria.filter;

        if (filter == "late" && pag.page > 1) {
            // Don't need to return anything since "late" will have returned the lot
            return res.json({});
        }


        // If we are looking for late payments then pagination will defeat us!
        if (filter == "late" || download || criteria.sortByName) {
            pag.page = 1;
            pag.limit = 99999999;
        }

        if (filter && filter.length > 0) {
            where.or = [
                { event: { name: { contains: filter } } },
                { event: { venue: { contains: filter } } },
                { event: { blurb: { contains: filter } } },
                { ref: { contains: filter } },
            ]
            if (filter.toLowerCase() == "paid") {
                where.or.push({ paid: true })
            }
            if (filter.toLowerCase() == "unpaid" || filter.toLowerCase() == "late") {
                where.or.push({ paid: false });
                where.or.push({ paid: null })
            }
        }
        Booking.find({
            where: where,
            // NOTE: Sorting by date/time of the foreign "event" table as shown below does not appear to work at all.
            //       We will have to sort it after getting the data set
            sort: {
                event: {
                    date: 'desc',
                    time: 'desc'
                }
            }
        }
        )
            .populate('user')
            .populate('event').populate('additions', { sort: { seq: 'asc' } })
            .paginate(pag)
            .exec(function (err, bookings) {
                if (err) {
                    sails.log.verbose('Error occurred trying to retrieve bookings.');
                    return res.negotiate(err);
                }

                // If we only want late bookings, filter the list
                if (filter && filter.toLowerCase() == "late") {
                    bookings = sails.controllers.booking.filterLate(bookings);
                }

                // Sort response by event date
                bookings.sort(Utility.jsonSort("event.date", true));

                if (download) {
                    sails.controllers.booking.download(req, res, req.user.username, false, false, false, bookings, req.user);
                }
                else {
                    // If session refers to a user who no longer exists, still allow logout.
                    if (!bookings) {
                        return res.json({});
                    }

                    return res.json(bookings);
                }
            }
            )

    },

    /**
     * Get all event bookings
     *
     * @param {Object} req
     * @param {Object} res
     */
    allEventBookings: function (req, res) {

        var pagLimit = 50;
        var criteria = req.param('criteria');
        if (criteria) {
            try {
                criteria = JSON.parse(criteria)
            }
            catch (e) {
                criteria = {}
            }
        }
        else {
            criteria = {}
        }
        req.session.bookingCriteria = JSON.stringify(criteria);
        req.session.userCriteria = "{}";

        // Special case for no data
        if (req.param("nodata") == "1") {
            return res.json({});
        }

        var download = req.param('download');

        var where = {};
        where.event = req.param("eventid");

        var pag = {
            "page": (criteria.page || 1),
            "limit": (criteria.limit || pagLimit)
        }
        var filter = criteria.filter;

        if (filter == "late" && pag.page > 1) {
            // Don't need to return anything since "late" will have returned the lot
            return res.json({});
        }

        // If we are looking for late payments then pagination will defeat us!
        if (filter == "late" || download || criteria.sortByName) {
            pag.page = 1;
            pag.limit = 99999999;
        }

        if (filter && filter.length > 0) {
            where.or = [
                { user: { surname: { contains: filter } } },
                { user: { firstName: { contains: filter } } },
                { user: { lodge: { contains: filter } } },
                { user: { email: { contains: filter } } },
                { user: { lodgeNo: { contains: filter } } },
                { user: { lodgeYear: { contains: filter } } },
                { user: { category: { contains: filter } } },
                { ref: { contains: filter } },

            ]
            if (filter.toLowerCase() == "paid") {
                where.or.push({ paid: true })
            }
            if (filter.toLowerCase() == "unpaid" || filter.toLowerCase() == "late") {
                where.or.push({ paid: false });
                where.or.push({ paid: null })
            }
        }

        var result = {
            bookings: []
        };

        // Drive the data from the main event
        Event.findOne(req.param("eventid")).exec(function (err, event) {
            if (err) {
                sails.log.error(err);
                return res.json({});
            }

            // Diagnostic email required?
            if (sails.config.events.emailDeveloperOnDownload && download && sails.config.events.developer) {
                Email.send(
                    "downloadAlert",
                    {
                        user: req.user,
                        event: event,
                        what: event.regInterest ? "interest" : "bookings",
                    },
                    {
                        from: event.name + ' <' + sails.config.events.email + '>',
                        to: sails.config.events.developer,
                        subject: "Download alert"
                    },
                    function (err) {
                        Utility.emailError(err);
                    }
                )
            }

            // Get ALL bookings first to calculate capacity
            if (pag.page == 1 && !event.regInterest) {
                Booking.find({
                    where: {
                        event: req.param("eventid")
                    },
                }
                ).exec(function (err, bookings) {
                    if (bookings) {
                        result.capacity = event.capacity;
                        _.forEach(bookings, function (booking) {
                            result.capacity -= booking.places;
                        })
                    }
                    // Send bookings to client
                    getBookings(req, res, event);
                })
            }
            else {
                // Send bookings to client
                getBookings(req, res, event);
            }

        });

        function getBookings(req, res, event) {

            // Now get the paginated bookings
            Booking.find({
                where: where,
                sort: "createdAt",
                // NOTE: Sorting by the surname/name of the foreign "user" table as shown below does not appear to work at all.
                //       We will have to sort it after getting the data set
                //sort: {
                //		user: {
                //			surname:'asc',
                //			firstName:'asc'
                //		}
                //}
            }
            )
                .populate('event')
                .populate('user')
                .populate('additions', { sort: { seq: 'asc' } }) // Sorting a "populate" by more than one field doesn't seem to work. You get no results at all.
                .paginate(pag)
                .exec(function (err, bookings) {
                    if (err) {
                        sails.log.verbose('Error occurred trying to retrieve bookings.');
                        return res.negotiate(err);
                    }

                    // If we only want late bookings, filter the list
                    if (filter && filter.toLowerCase() == "late") {
                        bookings = sails.controllers.booking.filterLate(bookings, event.grace);
                    }

                    // Augment the bookings with the particular order info
                    bookings = augmentBookings(event, bookings, function (bookings) {
                        // Sort response by user surname (case insensitive) unless it is for a download, in which
                        // case we will sort it later in the download function
                        // BIG HAIRY NOTE:  If we are using pagination this will be confusing.  For example, we may get the
                        //                  first page of 10 and that will be in "createdAt" order and then we will sort that
                        //                  set by surname.  So what you might see in the first 10 records on an unpaginated
                        //                  set might be different to what you see in a paginated set
                        //
                        // SECOND BIG HAIRY NOTE: It confuses me so lets not bother. Just show the bookings in the order we have them unless
                        // requested
                        if (criteria.sortByName) {
                            bookings.sort(Utility.jsonSort("user.surname", false, function (a) { return (a && typeof a == "string" ? a.toUpperCase() : a) }))
                        }

                        if (download) {
                            ////Event.findOne(req.param("eventid")).exec(function(err,event){
                            sails.controllers.booking.download(req, res, event.code, true, event.addressReqd, event.voReqd, bookings);
                            ////})
                        }
                        else {
                            // If session refers to a user who no longer exists, still allow logout.
                            result.bookings = bookings;
                            return res.json(result);
                        }
                    })


                    // Augment the bookings with order info
                    function augmentBookings(event, bookings, cb) {
                        var newBookings = [];
                        async.each(bookings, function (booking, next) {
                            var b = booking;
                            if (event.order && event.order != "C") {
                                Utility.augmentUser(event, booking.user, function (augmentedUser) {
                                    b.user = augmentedUser;
                                    b.orderLabel = augmentedUser.orderLabel;
                                    newBookings.push(b);
                                    next();
                                })
                            }
                            else {
                                b.orderLabel = "Lodge";
                                newBookings.push(b);
                                next();
                            }
                        }
                            , function (err) {
                                if (err) {
                                    sails.log.error(err);
                                }
                                cb(newBookings)
                            })
                    }

                })
        }

    },

    /**
     * Get all user bookings
     *
     * @param {Object} req
     * @param {Object} res
     */
    allUserBookings: function (req, res) {

        var criteria = req.param('criteria');
        if (criteria) {
            try {
                criteria = JSON.parse(criteria)
            }
            catch (e) {
                criteria = {}
            }
        }
        else {
            criteria = {}
        }
        req.session.bookingCriteria = JSON.stringify(criteria);
        /////req.session.userCriteria="{}";

        // Special case for no data
        if (req.param("nodata") == "1") {
            return res.json({});
        }

        var download = req.param('download');

        var pag = {
            "page": (criteria.page || 1),
            "limit": (criteria.limit || 50)
        }
        var filter = criteria.filter;

        if (filter == "late" && pag.page > 1) {
            // Don't need to return anything since "late" will have returned the lot
            return res.json({});
        }

        // If we are looking for late payments then pagination will defeat us!
        if (filter == "late" || download) {
            pag.page = 1;
            pag.limit = 99999999;
        }

        User.findOne(req.param("userid")).exec(function (err, user) {
            if (err) {
                sails.log.verbose('Error occurred trying to retrieve user.');
                return res.negotiate(err);
            }
            var where = {};
            where.user = user.id;

            if (filter && filter.length > 0) {
                where.or = [
                    { event: { name: { contains: filter } } },
                    { event: { venue: { contains: filter } } },
                    { event: { blurb: { contains: filter } } },
                    { ref: { contains: filter } },
                ]
                if (filter.toLowerCase() == "paid") {
                    where.or.push({ paid: true })
                }
                if (filter.toLowerCase() == "unpaid" || filter.toLowerCase() == "late") {
                    where.or.push({ paid: false });
                    where.or.push({ paid: null })
                }
            }

            Booking.find({
                where: where,
                // NOTE: Sorting by date/time of the foreign "event" table as shown below does not appear to work at all.
                //       We will have to sort it after getting the data set
                sort: {
                    event: {
                        date: 'desc',
                        time: 'desc'
                    }
                }
            }
            )
                .populate('event').populate('additions', { sort: { seq: 'asc' } })
                .paginate(pag)
                .exec(function (err, theBookings) {
                    if (err) {
                        sails.log.verbose('Error occurred trying to retrieve bookings.');
                        return res.negotiate(err);
                    }

                    // Only show bookings for events where the user is the organiser or if they are an admin
                    var bookings = [];
                    _.forEach(theBookings, function (booking) {
                        if (Utility.isAdmin(req.user, booking.event)) {
                            bookings.push(booking)
                        }
                    })

                    // If we only want late bookings, filter the list
                    if (filter && filter.toLowerCase() == "late") {
                        bookings = sails.controllers.booking.filterLate(bookings);
                    }

                    // Sort response by event date
                    bookings.sort(Utility.jsonSort("event.date", true));

                    if (download) {
                        sails.controllers.booking.download(req, res, user.surname.replace(RegExp(" ", "g"), "_") + '_' + user.firstName, false, false, false, bookings, user);
                    }
                    else {
                        // If session refers to a user who no longer exists, still allow logout.
                        if (!bookings) {
                            return res.json({});
                        }

                        return res.json(bookings);
                    }
                }
                )
        })

    },

    /**
     *
     * Build BCC for booking emails
     */
    bookingBCC: function (booking, organisers) {
        var bcc = [];
        var organiserIsDev = false;
        var eventOrganiserId = booking.event.organiser;
        organisers.forEach(function (organiser, o) {
            if (organiser) {
                if (organiser.email) {
                    bcc.push(organiser.email)
                    if (organiser.email == sails.config.events.developer) {
                        organiserIsDev = true;
                    }
                } else {
                    if (typeof organiser === 'string' && organiser !== sails.config.events.developer) {
                        bcc.push(organiser)
                    }
                }
                if (booking.event.id && organiser.id) {
                    // It is an event object
                    if (organiser.id = eventOrganiserId) {
                        //mainOrganiser=organiser;
                        booking.event.organiser = organiser;
                    }
                    else {
                        booking.event.organiser2 = organiser;
                    }
                }
            }
        })
        if (!organiserIsDev && sails.config.events.emailDeveloperOnBooking) {
            bcc.push(sails.config.events.developer)
        }
        return bcc;
    },

    /**
     * Filter bookings so that we only have those that are late in paying
     */
    filterLate: function (bookings, grace) {
        var bookingsOut = [];
        bookings.forEach(function (booking, i) {
            // Calculate the deadline date
            //console.log("Checking booking for "+booking.user.name)
            var g = (grace) ? grace : booking.event.grace;
            if (g > 0 && booking.bookingDate) {
                var dl = new Date(booking.bookingDate);
                dl.setDate(dl.getDate() + g + 1);
                // If the date is beyond the event closing date then use the event closing date instead
                var cd = new Date(booking.event.closingDate);
                if (dl > cd) {
                    dl = cd;
                }
                //console.log(dl)
                if (new Date() > dl) {
                    //console.log("late")
                    bookingsOut.push(booking)
                }
            }
        })
        return bookingsOut;
    },

    /**
     * Update booking (delete)
     */
    updateBooking: function (req, res) {

        // The only supported action is "delete" as the rest of booking maintenance is done via
        // the "makeBooking" function.  However, we will stick to our naming convention
        // in case that changes
        var action = req.param("action");
        var bookingId = req.param("bookingid");

        // Get all the information first (for the email)
        Booking.findOne(bookingId).populate("user").populate("event").populate("additions").exec(function (err, booking) {
            if (err) {
                return res.genericErrorResponse('470', 'This booking no longer exists!')
            }

            // Order label
            var orderLabel = sails.controllers.booking.orderLabel(booking.event.order);

            Order.find({ user: booking.user.id }).exec(function (err, orders) {
                var where = {
                    or: [
                        { id: booking.event.organiser }
                    ]
                }
                if (booking.event.organiser2) {
                    where.or.push({ id: booking.event.organiser2 })
                }

                //User.findOne(booking.event.organiser).exec(function(err, organiser){
                User.find(where).exec(async function (err, organisers) {
                    if (!organisers) {
                        organisers = []
                    }
                    var mainOrganiser = {
                        name: "Unknown"
                    };
                    var bcc = sails.controllers.booking.bookingBCC(booking, organisers);

                    // Create linked bookings
                    var linkedBookings = booking.additions;
                    if (linkedBookings) {
                        linkedBookings.forEach(function (linkedBooking, index) {
                            if (!linkedBooking.rank)
                                linkedBooking.rank = ""
                            if (!linkedBooking.dietary)
                                linkedBooking.dietary = ""
                            if (!linkedBooking.lodge)
                                linkedBooking.lodge = ""
                            if (!linkedBooking.lodgeNo)
                                linkedBooking.lodgeNo = ""
                        })
                    }

                    var formattedDate = booking.event.date.toString();
                    formattedDate = formattedDate.substr(0, formattedDate.indexOf("00:00:00"));
                    var updated = "";

                    // Booking payment deadline
                    var deadline = "N/A";
                    if (booking.event.grace && booking.event.grace > 0 && !booking.paid) {
                        var dl = new Date(booking.bookingDate);
                        dl.setDate(dl.getDate() + booking.event.grace);
                        dl = dl.toString();
                        deadline = dl.substr(0, dl.indexOf(":") - 2);

                    }

                    // Decide what to do based on the action
                    if (action == "edit") {
                        // Not supported
                    }
                    else if (action == "delete") {

                        // Issue refund if online payments used
                        if (booking.paymentReference) {
                          try {
                            await sails.controllers.payment.issueRefund(booking, booking.amountPaid);
                          } catch (err) {
                            console.error(err);
                            // We will cancel the booking anyway
                          }
                        }

                        // Carry on and delete it
                        Booking.destroy(bookingId).exec(function (err) {
                            if (err) {
                                return res.negotiate(err)
                            }
                            // Cancel lodge room details
                            LodgeRoom.update({ booking: bookingId }, { cancelled: true }).exec(function () { })
                            // Deal with linked bookings
                            LinkedBooking.destroy({ booking: bookingId }).exec(function (err) {

                                if (bookingId)
                                    updated = ' has been cancelled'


                                if (booking.user.email) {

                                    sails.controllers.booking.setEmailInfo(booking.event, booking.user, orders);

                                    var emailOpts = {
                                        recipientName: Utility.recipient(booking.user.salutation, booking.user.firstName, booking.user.surname),
                                        subject: booking.event.regInterest ? "Event interest cancellation confirmation" : "Event booking cancellation confirmation",
                                        from: booking.event.name + ' <' + sails.config.events.email + '>',
                                        to: booking.user.email,
                                        bcc: bcc,
                                        user: booking.user,
                                        event: booking.event,
                                        booking: booking,
                                        updated: updated,
                                        orderLabel: orderLabel,
                                        deadline: deadline,
                                        formattedDate: formattedDate,
                                        linkedBookings: linkedBookings,
                                        bookingRef: booking.ref,
                                    }
                                    sails.controllers.booking.bookingConfirmationEmail(emailOpts);


                                }


                                return res.ok();
                            })
                        })

                    }
                    else if (action == "copy" || action == "create") {
                        // Not supported
                    }

                })
            })

        })

    },


    /**
     * Transfer bookings
     */
    transferBookings: function (req, res) {
        var from = req.param("id");
        var to = req.param("newuser");
        var booking = req.param("booking");

        // Here we are going to build an array of promises for each update and only return
        // to the client when .all() the updates are complete
        var updates = [];
        var criteria = {};
        if (booking) {
            criteria.id = booking;
        }
        else {
            criteria.user = from;
        }
        Booking.find(criteria)
            .then(function (bookings) {
                bookings.forEach(function (booking, b) {
                    updates.push(
                        Booking.update(booking.id, { user: to })
                            .then(function (bookingArr) {
                                //console.log("Updated "+bookingArr[0].id)
                            })
                    )
                })
                return updates;
            })
            .all()
            .then(function (update) {
                //console.log("All done")
                return res.ok()
            })
            .catch(function (err) {
                return res.negotiate(err);
            })
    },

    /**
     * Process late payers
     */
    processLatePayers: function () {
        var info = "Processing late payers...";

        /*
        Email.send(
                    "diagnostic",
                    {
                    err:"Processing late payers"
                    },
                    {
                    to: sails.config.events.developer,
                    subject: "Diagnostics"
                },
                function(err) {
                    if (err) sails.log.error(err);
                    sails.log.info("First email sent");
                    Email.send(
                        "latePaymentReminder", {
                            recipientName: "fred bloggs",
                            senderName: sails.config.events.title,
                            eventDate: "Any old date",
                            event: {
                                organiser:{}
                            },
                            deadline: "Soon",
                            details: {}
                        },
                        {
                            //to: booking.user.email,
                            to: sails.config.events.developer,
                            subject: "TEST Late payment reminder"
                        },
                        function(err) {
                            if (err) sails.log.error(err);
                            sails.log.info("Second email sent");
                        }
                    )
                }
            )
            */

        sails.log.debug(info);
        //Utility.diagnosticEmail(info,"Late payment daemon");
        // Get a list of open events
        var today = Utility.today()
        Event.find({
            where: {
                or: [
                    { open: true },
                    { open: false, closingDate: { '>=': today } },
                    { open: null, closingDate: { '>=': today } },
                ],
                or: [{ free: false }, { free: null }],
                or: [{ regInterest: false }, { regInterest: null }],
                latePaymentChecking: true,
                closingDate: { '>=': today },
                grace: { '>': 0 },
                price: { '>': 0 }
            },
            sort: {
                date: 'desc',
                time: 'desc'
            }
        })
            .populate('organiser')
            .populate("organiser2")
            .then(function (events) {
                //console.log(events)
                // Get a list of bookings for this event that are late with their payment
                events.forEach(function (event, ev) {
                    // Format some data for the email
                    var formattedDate = event.date.toString();
                    formattedDate = formattedDate.substr(0, formattedDate.indexOf("00:00:00"));
                    // Get bookings
                    Booking.find({
                        where: {
                            event: event.id,
                            or: [{ paid: false }, { paid: null }]
                        }
                    })
                        .populate('user')
                        .then(function (bookings) {

                            var remindersSent = false;
                            // Get bookings that will be late in 48 hours
                            if (event.grace > 2) {
                                var warnings = sails.controllers.booking.filterLate(bookings, (event.grace - 2));
                                if (warnings.length > 0) {
                                    var nw = [];
                                    warnings.forEach(function (booking, b) {
                                        var reminderDeadline = Utility.today();
                                        reminderDeadline.setDate(reminderDeadline.getDate() - 2);
                                        if (booking.lastPaymentReminder) {
                                            reminderDeadline.setDate(booking.lastPaymentReminder.getDate() + (sails.config.events.latePaymentReminderInterval - 2));
                                        }
                                        if (reminderDeadline <= today) {
                                            nw.push(booking)
                                        }
                                    })
                                    if (nw.length > 0) {
                                        // Send a list to the organiser warning of bookings that will get late payment reminders within
                                        // 48 hours
                                        var to = [event.organiser.email.toLowerCase(), (event.organiser2 ? event.organiser2.email.toLowerCase() || "" : "")];
                                        ////if (sails.config.events.reminderTestMode) {
                                        ////	to="";
                                        ////}
                                        remindersSent = true;
                                        const latePaymentWarning = {
                                          recipientName: Utility.recipient(event.organiser.salutation, event.organiser.firstName, event.organiser.surname),
                                          senderName: sails.config.events.title,
                                          reminderTestMode: sails.config.events.reminderTestMode,
                                          eventDate: formattedDate,
                                          event: event,
                                          bookings: nw
                                        };
                                        const recipients = {
                                          //to: booking.user.email,
                                          to: to,
                                          bcc: (sails.config.events.emailDeveloperOnLatePayment && sails.config.events.developer && sails.config.events.developer != event.organiser.email) ? sails.config.events.developer : "",
                                          subject: event.name + " - Late payment reminder warning"
                                        };
                                        Email.send(
                                            "latePaymentWarning",
                                            latePaymentWarning,
                                            recipients,
                                            function (err) {
                                                if (err) {
                                                  sails.log.error("Error occurred sending late payment warning email to " + to);
                                                  sails.log.error(recipients);
                                                  // sails.log.error(latePaymentWarning);
                                                  sails.log.error(err);
                                                }
                                                emailLate();
                                            }
                                        )
                                    }
                                }
                            }

                            // If we haven't emailed the late guys then do it now
                            if (!remindersSent) {
                                emailLate();
                            }

                            // Hoisted function to process emails for late payers
                            function emailLate() {
                                // Filter bookings so we only have late payers
                                //Utility.diagnosticEmail(bookings.slice(),"Bookings pre-filter");
                                bookings = sails.controllers.booking.filterLate(bookings, event.grace);

                                // Process late payers using async so that the emails do not go simultaneously
                                async.each(bookings, function (booking, next) {
                                    // Only email a reminder if a week has passed since last reminder
                                    var reminderDeadline = Utility.today();
                                    if (booking.lastPaymentReminder) {
                                        reminderDeadline.setDate(booking.lastPaymentReminder.getDate() + sails.config.events.latePaymentReminderInterval);
                                    }
                                    //sails.log.debug(booking.user.name+" reminder deadline "+reminderDeadline);
                                    if (reminderDeadline <= today) {
                                        if (sails.config.events.reminderTestMode) {
                                            sails.log.debug("Reminder test mode: " + Utility.recipient(booking.user.salutation, booking.user.firstName, booking.user.surname));
                                            next();
                                        }
                                        sails.log.debug("Issuing late payment reminder for " + event.name + " for " + booking.user.name + ((sails.config.events.reminderTestMode) ? " in test mode" : " "));
                                        // Update the booking so we don't spam them
                                        var to = booking.user.email.toLowerCase();
                                        var cc = [(event.organiser.email.toLowerCase() || ""), (event.organiser2 ? event.organiser2.email.toLowerCase() || "" : "")];
                                        // Update the booking whether we are in test mode or not
                                        var howMany = (!booking.remindersSent) ? 1 : booking.remindersSent + 1;
                                        Booking.update(booking.id, {
                                            lastPaymentReminder: today,
                                            remindersSent: howMany
                                        }).exec(function (err, booking) { });

                                        // In test mode, make sure only the developer gets an email
                                        ///if (sails.config.events.reminderTestMode) {
                                        ///    to="";
                                        ///}

                                        var dl = new Date(booking.bookingDate);
                                        dl.setDate(dl.getDate() + event.grace);
                                        dl = dl.toString();
                                        var deadline = dl.substr(0, dl.indexOf(":") - 2);

                                        // Send email reminder
                                        const latePaymentReminder = {
                                          recipientName: Utility.recipient(booking.user.salutation, booking.user.firstName, booking.user.surname),
                                          senderName: sails.config.events.title,
                                          eventDate: formattedDate,
                                          event: event,
                                          deadline: deadline,
                                          details: booking
                                        };
                                        const recipients = {
                                          //to: booking.user.email,
                                          to: to,
                                          cc: cc,
                                          bcc: (sails.config.events.emailDeveloperOnLatePayment && sails.config.events.developer && sails.config.events.developer != event.organiser.email) ? sails.config.events.developer : "",
                                          subject: event.name + " - Late payment reminder"
                                        };
                                        Email.send(
                                            "latePaymentReminder",
                                            latePaymentReminder,
                                            recipients,
                                            function (err) {
                                                if (err) {
                                                  sails.log.error("Error occurred sending late payment reminder email to " + to);
                                                  sails.log.error(recipients);
                                                  // sails.log.error(latePaymentReminder);
                                                  sails.log.error(err);
                                                }
                                                next(); // Next booking
                                            }
                                        );
                                        sails.log.debug("Success: Late payment reminder for " + event.name + " for " + booking.user.name + ((sails.config.events.reminderTestMode) ? " in test mode" : " "));
                                    }
                                    else {
                                        next(); // Next booking
                                    }
                                }, function (err) {
                                    // All bookings done
                                    if (err) {
                                        sails.log.error(err);
                                    }
                                    //Utility.diagnosticEmail("Late payers processed","Late payment daemon");
                                })

                            }

                        })
                })

            })

    },

    /**
     * Download bookings
     */
    download: function (req, res, prefix, eventBookings, addressReqd, voReqd, bookings, user) {

        if (!bookings) {
            bookings = []
        }

        var label, labelNo;

        // Create basic options
        var options = {};
        options.filename = prefix + '_' + ((new Date().getTime().toString())) + '.csv';
        //options.nested=true;

        // Build a custom JSON for the CSV
        var data = [];
        var count = 0;

        async.each(bookings, function (booking, next) {
            if (user && !booking.user.surname) {
                booking.user = user
            }
            // Label for the lodge entity
            if (eventBookings) {
                // All the bookings are for the same event so we only need to work out the labels
                // once
                if (!label) {
                    if (!booking.event.order || booking.event.order == "C") {
                        label = "lodge";
                        labelNo = "lodgeNo";
                    }
                    else {
                        _.forEach(sails.config.events.orders, function (cfg) {
                            if (booking.event.order == cfg.code) {
                                label = (cfg.label) ? cfg.label.toLowerCase() : "lodge";
                                labelNo = label + "No";
                                return false;
                            }
                        })
                    }
                }
            }
            else {
                // We cannot know what the order might be from booking to booking
                // so use a generic label
                label = "order";
                labelNo = "orderNo";
            }
            var row = {};
            // Is there a balance due?
            booking.balance = booking.cost - booking.amountPaid;
            var amountPaid;
            // Divide amount paid between places UNLESS there is a balance
            // due - in which case that is nonsensical
            if (booking.balance > 0) {
                amountPaid = booking.amountPaid;
            }
            else {
                amountPaid = booking.amountPaid / booking.places;
            }
            var mop = booking.mop || "";
            //if (!user) {
            //    row.seq=parseInt(booking.ref.replace(prefix,""));
            //}
            row.count = null;
            row.tableNo = booking.tableNo || "";
            row.ref = booking.ref || "";
            row.surname = booking.user.surname || "";
            row.firstName = booking.user.firstName || "";
            row.displayName = booking.user.salutation + " " + booking.user.name;
            if (sails.config.events.userCategories.length > 0) {
                row.category = booking.user.category || "";
            }
            if (addressReqd) {
                row.address1 = booking.user.address1 || "";
                row.address2 = booking.user.address2 || "";
                row.address3 = booking.user.address3 || "";
                row.address4 = booking.user.address4 || "";
                row.postcode = booking.user.postcode || "";
            }
            row.email = booking.user.email || "";
            row.phone = (booking.user.phone) ? "Tel: " + booking.user.phone : ""; // Using the "Tel:" string stops excel turning it into a meaningless numeric column
            row.dietary = booking.dietary || "";
            row.menuChoice = booking.menuChoice || "";
            row.info = booking.info || "";
            row.places = booking.places;
            row.paid = booking.paid || "";
            row.cost = booking.cost || "";
            row.amountPaid = amountPaid || "";
            row.balance = booking.balance || "";
            row.mop = mop;
            row.creationDate = booking.bookingDate;
            if (voReqd && booking.user.isVO) {
                row.voLodge = booking.user.voLodge;
                row.voLodgeNo = booking.user.voLodgeNo;
                row.voAvcCentre = booking.user.voCentre;
                row.voAvcAcArea = booking.user.voArea;
            }
            else {
                row.voLodge = "";
                row.voLodgeNo = "";
                row.voAvcCentre = "";
                row.voAvcAcArea = "";
            }
            //row.createdAt=booking.createdAt;


            // Craft or other order?
            if (!booking.event.order || booking.event.order == "C") {
                // Craft
                row.salutation = booking.user.salutation || "";
                row.rank = booking.user.rank || "";
                row[label] = booking.user.lodge || "";
                row[labelNo] = booking.user.lodgeNo || "";
                if (sails.config.events.lodgeYear) {
                    var ly = sails.config.events.lodgeYearDownloadLabel || "lodgeYear";
                    row[ly] = booking.user.lodgeYear || "";
                }
                row.centre = booking.user.centre || "";
                row.area = booking.user.area || "";
                pushRow(booking, amountPaid, mop, row);
                // Next booking
                next();
            }
            else {

                // Create a callback for the retrieval of the users orders
                var cb = _.bind(function (err, orders) {
                    _.forEach(orders, function (order) {
                        if (booking.event.order == order.code) {
                            row.salutation = order.salutation || "";
                            row.rank = order.rank || "";
                            row[label] = order.name || "";
                            row[labelNo] = order.number || "";
                            if (sails.config.events.lodgeYear) {
                                row.lodgeYear = order.year || "";
                            }
                            row.centre = order.centre || "";
                            row.area = order.area || "";
                        }
                        return false;
                    })
                    pushRow(this.booking, this.amountPaid, this.mop, this.row);
                    // Next booking
                    next(err);
                }, {
                    booking: booking,
                    amountPaid: amountPaid,
                    mop: mop,
                    row: row
                })

                // Other order, so we need to get this user orders and pick the right one
                Order.find({ user: booking.user.id }).exec(cb)

            }

        }, function (err) {
            // Finally
            // Sort by creation date if we are downloading bookings for an event
            //if (!user) {
            //   data.sort(Utility.jsonSort("bookingDate", false))
            //}
            // Re-process the rows and add a sequence number
            //var seq=0;
            //data.forEach(function(row,i){
            //    seq+=1;
            //    row.addedSeq=seq;
            //});
            // Go back to original booking ref sequence
            //if (!user) {
            //    data.sort(Utility.jsonSort("seq", false))
            //}
            // Send CSV
            Utility.sendCsv(req, res, data, options)
        })

        function pushRow(booking, amountPaid, mop, row) {
            count++;
            row.count = count;
            data.push(row);
            if (booking.balance > 0) {
                // Amount paid is irrelevant/nonsensical on additional
                // places if a balance is due
                amountPaid = null;
            }
            // Add additional places as rows also
            booking.additions.forEach(function (addition, j) {
                var row = {};
                //if (!user) {
                //    row.seq=parseInt(booking.ref.replace(prefix,""));
                //}
                count++;
                row.count = count;
                row.tableNo = booking.tableNo || "";
                row.ref = booking.ref || "";
                row.salutation = addition.salutation || "";
                row.surname = addition.surname || "";
                row.firstName = addition.firstName || "";
                row.displayName = row.salutation + " " + row.firstName + " " + row.surname;
                row.rank = addition.rank || "";
                row[label] = addition.lodge || "";
                row[labelNo] = addition.lodgeNo || "";
                if (sails.config.events.lodgeYear) {
                    row.lodgeYear = addition.year || "";
                }
                row.centre = addition.centre || booking.user.centre || "";
                row.area = addition.area || booking.user.area || "";
                row.dietary = addition.dietary || "";
                row.menuChoice = addition.menuChoice || "";
                row.paid = booking.paid || "";
                row.amountPaid = amountPaid || "";
                row.balance = "";
                row.mop = mop || "";
                // If the createdAt date is later than the booking date for the main booking, use that for the booking date
                //var ca=new Date(addition.createdAt.getFullYear(), addition.createdAt.getMonth(), addition.createdAt.getDate());
                //var ba=new Date(booking.bookingDate.getFullYear(), booking.bookingDate.getMonth(), booking.bookingDate.getDate());
                //if (ca.getTime()>ba.getTime()) {
                //    row.bookingDate=addition.createAt;   // Use the additional booking creation date
                //}
                //else {
                row.creationDate = booking.bookingDate;   // Use the main booking date
                //}
                //row.createdAt=addition.createdAt;
                data.push(row);
            })
        }

    },

    /**
    * Download lodge room
    */
    lodgeRoom: function (req, res) {


        var options = {};

        // Get the event
        Event.findOne(req.param("eventid")).exec(function (err, event) {
            if (event) {

                // Diagnostic email required?
                if (sails.config.events.emailDeveloperOnDownload && sails.config.events.developer) {
                    Email.send(
                        "downloadAlert",
                        {
                            user: req.user,
                            event: event,
                            what: "the lodge room"
                        },
                        {
                            from: event.name + ' <' + sails.config.events.email + '>',
                            to: sails.config.events.developer,
                            subject: "Download alert"
                        },
                        function (err) {
                            Utility.emailError(err);
                        }
                    )
                }

                var seq = 0;
                options.filename = event.name + '_lr_' + ((new Date().getTime().toString())) + '.csv';
                LodgeRoom.find({ event: event.id }).sort('createdAt')
                    .populate("booking")
                    .exec(function (err, data) {
                        _.forEach(data, function (d, i) {
                            seq++;
                            d.seq = seq;
                            // Add the sequence number and remove confusing extras
                            d.ref = "";
                            if (d.booking) {
                                d.ref = d.booking.ref;
                            }
                            d.rank = (d.rank || "");
                            d.status = (d.cancelled) ? "Cancelled" : "";
                            delete d.id;
                            delete d.event;
                            delete d.booking;
                            delete d.cancelled;
                        })
                        Utility.sendCsv(req, res, data, options);
                    })
            }
            else {
                Utility.sendCsv(req, res, [], options);
            }
        })


    },



};

