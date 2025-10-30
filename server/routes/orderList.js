const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// GET /api/order/list
router.get('/list', async (req, res) => {
  try {
    const orders = await Order.find().sort({ _id: -1 }).limit(100).lean();
    res.json({ success: true, orders });
  } catch (err) {
    console.error('order list error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// POST /api/order/list (frontend expects POST)
router.post('/list', async (req, res) => {
  try {
    const orders = await Order.find().sort({ _id: -1 }).limit(200).lean();
    res.json({ success: true, orders });
  } catch (err) {
    console.error('order list (post) error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

module.exports = router;
