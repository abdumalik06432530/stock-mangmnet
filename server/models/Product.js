const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String },
  model: { type: String },
  description: { type: String },
  category: { type: String },
  subCategory: { type: String },
  type: { type: String },
  accessoryQuantities: { type: mongoose.Schema.Types.Mixed },
  quantity: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  images: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', ProductSchema);
