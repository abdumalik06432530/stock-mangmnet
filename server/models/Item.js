const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., back, seat, arm, headrest, mechanism, gaslift, castor, chrome
  model: { type: String },
  furnitureType: { type: String, default: 'chair' },
  quantity: { type: Number, default: 0 },
  optional: { type: Boolean, default: false },
  lowStock: { type: Number, default: 10 }
});

module.exports = mongoose.model('Item', ItemSchema);
