const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Item = require('../models/Item');
const Product = require('../models/Product');
const User = require('../models/User');
const ordersController = require('../controllers/ordersController');

function calculateComponentsNeeded(order) {
  // Only chairs require the standard set of components. For other furniture types, no component reservation.
  const furnitureType = (order.furnitureType || order.type || '').toString().toLowerCase();
  if (furnitureType !== 'chair' && furnitureType !== 'chairs') return {};

  return {
    back: 1 * order.quantity,
    seat: 1 * order.quantity,
    arm: 2 * order.quantity,
    mechanism: 1 * order.quantity,
    gaslift: 1 * order.quantity,
    castor: 5 * order.quantity,
    chrome: 1 * order.quantity,
    headrest: order.headrest ? 1 * order.quantity : 0
  };
}

// POST /api/orders/batch
router.post('/batch', ordersController.createOrders);

// POST /api/orders - create one or many orders (accepts single object or array)
router.post('/', ordersController.createOrders);

// DEBUG: echo incoming body (temporary) - helps inspect frontend payloads
router.post('/debug-echo', (req, res) => {
  try {
    console.log('[debug-echo] received:', JSON.stringify(req.body, null, 2));
    return res.json({ success: true, body: req.body });
  } catch (err) {
    console.error('debug-echo error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
});

// GET /api/orders - list orders
// GET /api/orders - list orders with optional filters: status, assignedFactory, shop, shopkeeper, dateFrom, dateTo
router.get('/', async (req, res) => {
  try {
    const { status, assignedFactory, shop, shopkeeper, dateFrom, dateTo, limit } = req.query;
    const q = {};
    // support search by orderNumber
    if (req.query.orderNumber) q.orderNumber = req.query.orderNumber;
    if (status) q.status = status;
    if (assignedFactory) q.assignedFactory = assignedFactory;
    if (shop) q.shop = shop;
    if (shopkeeper) q.shopkeeper = shopkeeper;
    if (dateFrom || dateTo) q.date = {};
    if (dateFrom) q.date.$gte = dateFrom;
    if (dateTo) q.date.$lte = dateTo;

    const l = Math.min(Number(limit || 200), 1000);
    const orders = await Order.find(q).sort({ _id: -1 }).limit(l).lean();
    return res.json({ success: true, orders });
  } catch (err) {
    console.error('orders list error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// PUT /api/orders/:id/assign - assign order to a factory manager
router.put('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedFactory } = req.body;
    if (!assignedFactory) return res.status(400).json({ success: false, message: 'assignedFactory required' });
    const order = await Order.findByIdAndUpdate(id, { assignedFactory, status: 'assigned' }, { new: true }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, order });
  } catch (err) {
    console.error('assign order error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// GET /api/orders/factory/:factoryId - list orders assigned to a factory manager
router.get('/factory/:factoryId', async (req, res) => {
  try {
    const { factoryId } = req.params;
    const orders = await Order.find({ assignedFactory: factoryId }).sort({ _id: -1 }).lean();
    return res.json({ success: true, orders });
  } catch (err) {
    console.error('factory orders list error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// PUT /api/orders/:id/accept - mark order accepted by factory/shop
router.put('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndUpdate(id, { status: 'accepted' }, { new: true }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, order });
  } catch (err) {
    console.error('accept order error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// PUT /api/orders/:id/assign-driver - assign driver and mark assigned
router.put('/:id/assign-driver', async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ success: false, message: 'driverId required' });
    const order = await Order.findByIdAndUpdate(id, { assignedDriver: driverId, status: 'assigned' }, { new: true }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, order });
  } catch (err) {
    console.error('assign-driver order error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// PUT /api/orders/:id/deliver - mark as delivered and update Product stock
router.put('/:id/deliver', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // mark delivered
    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();

    // If order has a backModel and furniture type is Chair, increment matching Product.quantity
    if (order.furnitureType === 'Chair' || (order.type && order.type.toLowerCase() === 'chair')) {
      // find product by subCategory/model or name matching backModel
      const prod = await Product.findOne({ $or: [{ subCategory: order.backModel }, { model: order.backModel }, { name: order.backModel }] });
      if (prod) {
        prod.quantity = (prod.quantity || 0) + (order.quantity || 0);
        await prod.save();
      }
    }

    return res.json({ success: true, order });
  } catch (err) {
    console.error('deliver order error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

module.exports = router;
