const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  shop: { type: String },
  furnitureType: { type: String },
  type: { type: String },
  backModel: { type: String },
  headrest: { type: Boolean, default: false },
  quantity: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  shopkeeper: { type: String },
  date: { type: String },
  customerName: { type: String },
  customerPhone: { type: String },
  customerEmail: { type: String },
  deliveryAddress: { type: String },
  notes: { type: String },
  assignedFactory: { type: String }
});

module.exports = mongoose.model('Order', OrderSchema);
