import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BookingForm.css';

const BookingForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        date: '',
        timeSlot: ''
    });
    const [timeSlots, setTimeSlots] = useState([]);
    const [message, setMessage] = useState('');

    // Fetch time slots and check availability with the backend
    useEffect(() => {
        const fetchAvailableSlots = async () => {
            try {
                const response = await axios.get('http://localhost:5000/available-slots', { params: { date: formData.date } });
                setTimeSlots(response.data); // Set available slots from server
            } catch (error) {
                console.error('Error fetching slots:', error);
            }
        };

        if (formData.date) {
            fetchAvailableSlots(); // Only fetch if a date is selected
        }
    }, [formData.date]); // Re-fetch slots when date changes

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/book', formData); // Removed 'response' variable
            setMessage('Your booking is confirmed, Thank You');

            // Refresh available slots after a booking
            setFormData({ ...formData, timeSlot: '' });
            const updatedSlots = await axios.get('http://localhost:5000/available-slots', { params: { date: formData.date } });
            setTimeSlots(updatedSlots.data);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Booking failed. Please try again.');
        }
    };

    return (
        <div className="booking-form-container">
            <h2>Book Your Test Drive</h2>
            <form onSubmit={handleSubmit} className="booking-form">
                <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
                <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} required />
                <input type="date" name="date" value={formData.date} onChange={handleChange} required />

                <select name="timeSlot" value={formData.timeSlot} onChange={handleChange} required>
                    <option value="">Select Time Slot</option>
                    {timeSlots.map((slot, index) => (
                        <option key={index} value={slot}>{slot}</option>
                    ))}
                </select>

                <button type="submit" className="booking-button">Book Appointment</button>
            </form>
            {message && <p className="confirmation-message">{message}</p>}
        </div>
    );
};

export default BookingForm;
