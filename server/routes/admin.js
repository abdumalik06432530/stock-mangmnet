const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Item = require('../models/Item');
const Order = require('../models/Order');
const adminProducts = require('../controllers/adminProductsController');
const adminOrders = require('../controllers/adminOrdersController');
const adminUsers = require('../controllers/adminUsersController');

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

// Admin Products
router.post('/products/add', adminProducts.add);
router.get('/products/list', adminProducts.list);
router.post('/products/list', adminProducts.list);
router.put('/products/:id', adminProducts.update);
router.delete('/products/:id', adminProducts.remove);
router.post('/products/update-quantity', adminProducts.updateQuantity);
router.post('/products/update-accessories', adminProducts.updateAccessories);

// Admin Orders
router.post('/orders/list', adminOrders.list);
router.post('/orders/delete', adminOrders.remove);

// Admin Users
router.get('/users/list', adminUsers.list);
router.post('/users/create', adminUsers.create);
router.put('/users/:id', adminUsers.update);
router.delete('/users/:id', adminUsers.remove);
router.post('/users/:id/status', adminUsers.setStatus);
router.post('/users/:id/assign-shop', adminUsers.assignShop);

module.exports = router;
