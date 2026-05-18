const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  age: { type: Number },
  bio: { type: String },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  location: { type: String },
  interests: [{ type: String }],
  profilePhoto: { type: String, default: '' },
  likedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  pushToken: { type: String, default: '' },
  images: [{ type: String }],
  likesCount: { type: Number, default: 0 },
  wallet: { type: Number, default: 0 },
  receivedGifts: [{
    giftId: { type: String },
    name: { type: String },
    price: { type: Number },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  chatBackground: { type: String, default: '#F8F9FA' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
