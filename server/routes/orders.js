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

// GET /api/orders - list orders
router.get('/', async (req, res) => {
  const orders = await Order.find().sort({ _id: -1 }).limit(200);
  res.json(orders);
});

module.exports = router;
