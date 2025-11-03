const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Item = require('../models/Item');
const Product = require('../models/Product');
const User = require('../models/User');
const ordersController = require('../controllers/ordersController');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

function getPayloadFromReq(req) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch (e) {
    return null;
  }
}

async function pushAudit(order, by, role, action, note) {
  if (!order) return;
  order.audit = order.audit || [];
  order.audit.push({ by: by || 'system', role: role || 'system', action: action || '', at: new Date(), note: note || '' });
}

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

// PUT /api/orders/:id/factory-accept - factory manager accepts an incoming order
router.put('/:id/factory-accept', async (req, res) => {
  try {
    const payload = getPayloadFromReq(req);
    if (!payload || payload.role !== 'factory') return res.status(403).json({ success: false, message: 'forbidden' });
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Only allow factory to accept if order is in requested or pending state
    if (!['requested','pending','accepted'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Order cannot be accepted in current state' });
    }
    order.factoryAcceptedBy = payload.id;
    order.factoryAcceptedAt = new Date();
    order.status = 'factory_accepted';
    await pushAudit(order, payload.id, payload.role, 'factory_accept', req.body.note || '');
    await order.save();
    return res.json({ success: true, order });
  } catch (err) {
    console.error('factory accept error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// PUT /api/orders/:id/admin-approve - admin approves an order (can adjust qty/backModel)
router.put('/:id/admin-approve', async (req, res) => {
  try {
    const payload = getPayloadFromReq(req);
    if (!payload || payload.role !== 'admin') return res.status(403).json({ success: false, message: 'forbidden' });
    const { id } = req.params;
    const { quantity, backModel, notes } = req.body;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Only allow admin approval if factory already accepted (optional)
    if (order.status !== 'factory_accepted' && order.status !== 'requested' && order.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Order cannot be approved in current state' });
    }
    if (Number.isFinite(quantity)) order.quantity = quantity;
    if (backModel) order.backModel = backModel;
    order.adminApprovedBy = payload.id;
    order.adminApprovedAt = new Date();
    order.status = 'admin_approved';
    await pushAudit(order, payload.id, payload.role, 'admin_approve', notes || '');
    await order.save();
    return res.json({ success: true, order });
  } catch (err) {
    console.error('admin approve error', err);
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

    // enforce allowed transition: only admin_approved or assigned orders can be delivered
    if (!['admin_approved', 'assigned', 'out_for_delivery'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Order not ready for delivery' });
    }

    // mark delivered
    order.status = 'delivered';
    order.deliveredAt = new Date();
    await pushAudit(order, 'system', 'system', 'delivered', 'Order marked as delivered');
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
