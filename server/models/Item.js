const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., back, seat, arm, headrest, mechanism, gaslift, castor, chrome
  model: { type: String },
  furnitureType: { type: String, default: 'chair' },
  // Optional shop-specific stock. If present, this Item belongs to a particular shop.
  shop: { type: String, default: null },
  quantity: { type: Number, default: 0 },
  optional: { type: Boolean, default: false },
  lowStock: { type: Number, default: 10 }
});

module.exports = mongoose.model('Item', ItemSchema);
