const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: false },
  type: { type: String, enum: ['text', 'gift', 'audio'], default: 'text' },
  giftData: {
    giftId: { type: String },
    name: { type: String },
    icon: { type: String },
    price: { type: Number }
  },
  seen: { type: Boolean, default: false }
}, { timestamps: true });

// Optimizing chat queries to prevent MongoDB crashes during large message loads
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, seen: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
