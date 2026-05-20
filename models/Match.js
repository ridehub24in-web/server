const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

matchSchema.index({ users: 1 });

module.exports = mongoose.model('Match', matchSchema);
