const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Item = require('../models/Item');

function calculateComponentsNeeded(order) {
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
router.post('/batch', async (req, res) => {
  const orders = req.body;
  if (!Array.isArray(orders) || orders.length === 0) return res.status(400).json({ error: 'invalid_input' });

  const session = await mongoose.startSession();
  try {
    let createdOrders = [];
    await session.withTransaction(async () => {
      // Make copies and check availability
      for (const order of orders) {
        if (!order || !order.quantity || order.quantity <= 0) throw { code: 'invalid_order', order };

        const needed = calculateComponentsNeeded(order);
        // Check components (items with type names)
        for (const [comp, qty] of Object.entries(needed)) {
          const item = await Item.findOne({ type: comp }).session(session);
          const available = item ? item.quantity : 0;
          if (available < qty) throw { code: 'insufficient_components', component: comp, needed: qty, available };
        }

        // check back model
        if (order.backModel) {
          const backItem = await Item.findOne({ type: 'back', model: order.backModel, furnitureType: order.furnitureType || 'chair' }).session(session);
          const availableBackQty = backItem ? backItem.quantity : 0;
          if (!backItem || availableBackQty < order.quantity) throw { code: 'insufficient_back_model', model: order.backModel, available: availableBackQty };
          // reserve back
          backItem.quantity -= order.quantity;
          await backItem.save({ session });
        }

        // reserve components
        for (const [comp, qty] of Object.entries(needed)) {
          const item = await Item.findOne({ type: comp }).session(session);
          item.quantity -= qty;
          await item.save({ session });
        }

        const o = new Order(order);
        await o.save({ session });
        createdOrders.push(o);
      }
    });

    res.json({ success: true, orders: createdOrders });
  } catch (err) {
    console.error('batch error', err);
    if (err && err.code) return res.status(400).json({ success: false, error: err.code, details: err });
    res.status(500).json({ success: false, error: 'server_error' });
  } finally {
    session.endSession();
  }
});

// POST /api/orders - create one or many orders (accepts single object or array)
router.post('/', async (req, res) => {
  const payload = req.body;
  const session = await mongoose.startSession();
  try {
    const ordersToCreate = Array.isArray(payload) ? payload : [payload];
    let createdOrders = [];
    await session.withTransaction(async () => {
      for (const order of ordersToCreate) {
        if (!order || !order.quantity || order.quantity <= 0) throw { code: 'invalid_order', order };

        const needed = calculateComponentsNeeded(order);
        for (const [comp, qty] of Object.entries(needed)) {
          const item = await Item.findOne({ type: comp }).session(session);
          const available = item ? item.quantity : 0;
          if (available < qty) throw { code: 'insufficient_components', component: comp, needed: qty, available };
        }

        if (order.backModel) {
          const backItem = await Item.findOne({ type: 'back', model: order.backModel, furnitureType: order.furnitureType || 'chair' }).session(session);
          const availableBackQty = backItem ? backItem.quantity : 0;
          if (!backItem || availableBackQty < order.quantity) throw { code: 'insufficient_back_model', model: order.backModel, available: availableBackQty };
          backItem.quantity -= order.quantity;
          await backItem.save({ session });
        }

        for (const [comp, qty] of Object.entries(needed)) {
          const item = await Item.findOne({ type: comp }).session(session);
          item.quantity -= qty;
          await item.save({ session });
        }

        const o = new Order(order);
        await o.save({ session });
        createdOrders.push(o);
      }
    });
    res.json({ success: true, orders: createdOrders });
  } catch (err) {
    console.error('create order error', err);
    if (err && err.code) return res.status(400).json({ success: false, error: err.code, details: err });
    res.status(500).json({ success: false, error: 'server_error' });
  } finally {
    session.endSession();
  }
});

// GET /api/orders - list orders
// GET /api/orders - list orders with optional filters: status, assignedFactory, shop, shopkeeper, dateFrom, dateTo
router.get('/', async (req, res) => {
  try {
    const { status, assignedFactory, shop, shopkeeper, dateFrom, dateTo, limit } = req.query;
    const q = {};
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

module.exports = router;
