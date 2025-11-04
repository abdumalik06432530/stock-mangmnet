const mongoose = require('mongoose');

const PendingItemSchema = new mongoose.Schema({
  type: { type: String, required: true },
  model: { type: String },
  furnitureType: { type: String, default: 'chair' },
  quantity: { type: Number, default: 0 },
  optional: { type: Boolean, default: false },
  requester: { type: String },
  // If a shop requested this item, store the shop id so approval can create shop-specific stock
  shop: { type: String, default: null },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNotes: { type: String },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('PendingItem', PendingItemSchema);
