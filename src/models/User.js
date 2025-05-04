const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  countryFrom: {
    type: String,
    required: true,
    trim: true
  },
  cityFrom: {
    type: String,
    required: true,
    trim: true
  },
  countryTo: {
    type: String,
    trim: true
  },
  cityTo: {
    type: String,
    trim: true
  },
  subscriptionType: {
    type: String,
    required: true,
    trim: true
  },
  paymentDate: {
    type: Date,
    // Removing default value so it will be null until payment is confirmed
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: process.env.MONGODB_COLLECTION_USERS || 'users'
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User; 