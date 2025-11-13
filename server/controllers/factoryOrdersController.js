const Order = require('../models/Order');
const Driver = require('../models/Driver');

function normalizeId(id) {
  return id ? id.toString() : undefined;
}

async function listFactoryOrders(req, res) {
  try {
    const { factoryId, status, shop, limit } = req.query;
    const q = {};
    if (factoryId) q.assignedFactory = factoryId;
    if (status) q.status = status;
    if (shop) q.shop = shop;
    const l = Math.min(Number(limit || 200), 1000);
    const orders = await Order.find(q).sort({ _id: -1 }).limit(l).lean();
    return res.json({ success: true, orders });
  } catch (err) {
    console.error('factory list orders error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function getOrderDetails(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ success: false, message: 'order_not_found' });
    return res.json({ success: true, order });
  } catch (err) {
    console.error('factory get order details error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function setProcessing(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'order_not_found' });
    order.status = 'processing';
    await order.save();
    return res.json({ success: true, order });
  } catch (err) {
    console.error('factory set processing error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function setOutForDelivery(req, res) {
  try {
    const { id } = req.params;
    const { driverId } = req.body || {};
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'order_not_found' });
    if (driverId) order.assignedDriver = normalizeId(driverId);
    order.status = 'out_for_delivery';
    await order.save();
    return res.json({ success: true, order });
  } catch (err) {
    console.error('factory set out_for_delivery error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function assignDriver(req, res) {
  try {
    const { id } = req.params;
    const { driverId } = req.body || {};
    if (!driverId) return res.status(400).json({ success: false, message: 'driverId_required' });
    const driver = await Driver.findById(driverId).lean();
    if (!driver) return res.status(404).json({ success: false, message: 'driver_not_found' });
    const order = await Order.findByIdAndUpdate(id, { assignedDriver: normalizeId(driverId), status: 'assigned' }, { new: true }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'order_not_found' });
    return res.json({ success: true, order });
  } catch (err) {
    console.error('factory assign driver error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

module.exports = {
  listFactoryOrders,
  getOrderDetails,
  setProcessing,
  setOutForDelivery,
  assignDriver,
};
