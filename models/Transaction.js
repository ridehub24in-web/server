const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  giftType: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentId: { type: String, required: true },
  orderId: { type: String },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  currency: { type: String, default: 'INR' },
  method: { type: String }, // card, upi, netbanking, etc.
  upiApp: { type: String }, // phonepe, gpay, etc.
  giftIcon: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
