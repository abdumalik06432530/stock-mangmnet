const Order = require('../models/Order');

async function list(_req, res) {
  try {
    const orders = await Order.find().sort({ _id: -1 }).limit(200).lean();
    return res.json({ success: true, orders });
  } catch (err) {
    console.error('admin orders list error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function remove(req, res) {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId_required' });
    const ord = await Order.findByIdAndDelete(orderId);
    if (!ord) return res.status(404).json({ success: false, message: 'order_not_found' });
    return res.json({ success: true, message: 'order_deleted' });
  } catch (err) {
    console.error('admin order delete error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

module.exports = { list, remove };
