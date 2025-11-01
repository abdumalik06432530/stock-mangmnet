const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  shop: { type: String },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productModel: { type: String },
  quantity: { type: Number, required: true },
  customerName: { type: String },
  customerPhone: { type: String },
  customerAddress: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sale', SaleSchema);
