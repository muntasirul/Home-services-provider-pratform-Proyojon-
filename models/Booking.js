const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  items: [
    {
      id: Number,
      name: String,
      price: Number,
      cat: String,
      icon: String,
      desc: String
    }
  ],
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'done', 'cancelled'],
    default: 'pending'
  },
  providerId: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', BookingSchema);
