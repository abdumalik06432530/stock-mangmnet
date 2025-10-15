const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Item = require('../models/Item');
const Order = require('../models/Order');

// Simple admin export endpoint: GET /api/admin/export
// Returns { users: [...], items: [...], orders: [...] }
router.get('/export', async (req, res) => {
  try {
    const users = await User.find().lean();
    const items = await Item.find().lean();
    const orders = await Order.find().lean();
    res.json({ users, items, orders });
  } catch (err) {
    console.error('admin export error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
