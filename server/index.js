const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// MySQL connection setup
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // Replace with your MySQL username
    password: '',       // Replace with your MySQL password
    database: 'carServiceBooking'  // Your MySQL database name
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Mailgun setup
const mailgun = new Mailgun(formData);
const mg = mailgun.client({username: 'api', key: '2ec7be17f6b713bec9df3bbc0f7bdc59-f6fe91d3-6df74d0f'});  // Replace with your actual Mailgun API Key

// Available Slots Endpoint
app.get('/available-slots', (req, res) => {
    const { date } = req.query; // Get date from query parameter

    // Define time slots
    const slots = [
        '9:00-12:00', '12:00-15:00', '15:00-18:00'
    ];

    const availableSlots = [];

    // Check the bookings in each time slot
    const query = `SELECT timeSlot, COUNT(*) AS count FROM bookings WHERE date = ? GROUP BY timeSlot`;
    db.query(query, [date], (err, results) => {
        if (err) {
            console.error('Error fetching slots:', err);
            return res.status(500).json({ message: 'Error fetching available slots' });
        }

        // Filter out fully booked slots
        slots.forEach(slot => {
            const slotCount = results.find(r => r.timeSlot === slot)?.count || 0;
            if (slotCount < 10) {
                availableSlots.push(slot);
            }
        });

        res.json(availableSlots);
    });
});

// POST /book - Booking Route
app.post('/book', (req, res) => {
    const { name, email, phone, date, timeSlot } = req.body;

    // Check if the slot has reached its limit
    const queryCount = `SELECT COUNT(*) AS count FROM bookings WHERE date = ? AND timeSlot = ?`;
    db.query(queryCount, [date, timeSlot], (err, results) => {
        if (err) {
            console.error('Error querying bookings:', err);
            return res.status(500).json({ message: 'Error checking slot availability' });
        }

        const count = results[0].count;
        if (count >= 10) {
            return res.status(400).json({ message: 'This time slot is fully booked. Please choose another slot.' });
        }

        // Generate a unique ID
        const generateUniqueID = (name) => {
            const initials = name.split(" ").map(word => word[0]).join("").toUpperCase();
            const randomString = crypto.randomBytes(3).toString('hex');  // 6 random characters
            return `${initials}${randomString}`.substring(0, 8);
        };

        const uniqueID = generateUniqueID(name);

        // Insert new booking into MySQL
        const insertQuery = `INSERT INTO bookings (name, email, phone, date, timeSlot, uniqueID) VALUES (?, ?, ?, ?, ?, ?)`;
        db.query(insertQuery, [name, email, phone, date, timeSlot, uniqueID], (err, result) => {
            if (err) {
                console.error('Error saving booking:', err);
                return res.status(500).json({ message: 'Booking failed' });
            }

            // Send confirmation email using Mailgun
            const emailData = {
                from: 'Excited User <mailgun@sandbox63ced46af8b6408eab51c883715c7af4.mailgun.org>',  // Replace with your Mailgun sandbox address
                to: [email],  // Recipient's email address
                subject: 'Car Service Booking Confirmation',
                text: `Dear ${name},\n\nYour booking is confirmed!\nYour unique ID: ${uniqueID}\nDate: ${date}, Time Slot: ${timeSlot}\n\nThank you!`,
                html: `<h1>Dear ${name},</h1><p>Your booking is confirmed!</p><p><strong>Unique ID:</strong> ${uniqueID}</p><p><strong>Date:</strong> ${date}, <strong>Time Slot:</strong> ${timeSlot}</p><p>Thank you!</p>`
            };

            // Send the email
            mg.messages.create('sandbox63ced46af8b6408eab51c883715c7af4.mailgun.org', emailData)  // Replace with your sandbox domain
                .then(msg => {
                    console.log('Email sent successfully:', msg);  // Log success
                    res.status(200).json({ message: 'Booking confirmed', uniqueID });
                })
                .catch(err => {
                    console.error('Error sending email:', err);  // Log error
                    res.status(500).json({ message: 'Failed to send email' });
                });
        });
    });
});

// Set up your server port
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
