// server/models/Booking.js
const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    date: String,
    timeSlot: String,
    uniqueID: String
});

module.exports = mongoose.model('Booking', BookingSchema);