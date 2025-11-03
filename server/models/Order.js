const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  shop: { type: String },
  furnitureType: { type: String },
  type: { type: String },
  backModel: { type: String },
  headrest: { type: Boolean, default: false },
  quantity: { type: Number, required: true },
  status: { type: String, default: 'requested' },
  orderNumber: { type: String },
  deliveredAt: { type: Date },
  assignedDriver: { type: String },
  shopkeeper: { type: String },
  date: { type: String },
  customerName: { type: String },
  customerPhone: { type: String },
  customerEmail: { type: String },
  deliveryAddress: { type: String },
  notes: { type: String },
  assignedFactory: { type: String }
  ,
  // Workflow audit & approvals
  requestedBy: { type: String },
  requestedByRole: { type: String },
  factoryAcceptedBy: { type: String },
  factoryAcceptedAt: { type: Date },
  adminApprovedBy: { type: String },
  adminApprovedAt: { type: Date },
  audit: { type: [{ by: String, role: String, action: String, at: Date, note: String }], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
