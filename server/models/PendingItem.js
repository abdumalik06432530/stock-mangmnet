const mongoose = require('mongoose');

const PendingItemSchema = new mongoose.Schema({
  type: { type: String, required: true },
  model: { type: String },
  furnitureType: { type: String, default: 'chair' },
  quantity: { type: Number, default: 0 },
  optional: { type: Boolean, default: false },
  requester: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNotes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PendingItem', PendingItemSchema);
