const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Shop = require('../models/Shop');

// POST /api/user/create
router.post('/create', async (req, res) => {
  try {
    const { username, password, name, role, phone, shopId } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'username and password required' });
    const existing = await User.findOne({ username }).exec();
    if (existing) return res.status(400).json({ success: false, message: 'username already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, name, role: role || 'shopkeeper' });
    if (shopId) user.shops = [shopId];
    await user.save();
    res.json({ success: true, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('user create', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// GET /api/user/list
router.get('/list', async (req, res) => {
  try {
    const users = await User.find().lean();
    // populate shop info if present
    const shopIds = Array.from(new Set(users.flatMap(u => u.shops || [])));
    const shops = await Shop.find({ _id: { $in: shopIds } }).lean();
    const shopMap = new Map(shops.map(s => [String(s._id), s]));
    const enriched = users.map(u => ({ ...u, shopId: (u.shops && u.shops[0]) ? shopMap.get(String(u.shops[0])) : null }));
    res.json({ success: true, users: enriched });
  } catch (err) {
    console.error('user list', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// PUT /api/user/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, phone, password, shopId } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'not_found' });
    if (password) user.password = await bcrypt.hash(password, 10);
    if (name) user.name = name;
    if (role) user.role = role;
    if (phone) user.phone = phone;
    if (shopId) user.shops = [shopId];
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('user update', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// DELETE /api/user/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error('user delete', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// POST /api/user/:id/status
router.post('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'not_found' });
    user.status = isActive ? 'active' : 'inactive';
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('user status', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// POST /api/user/:id/assign-shop
router.post('/:id/assign-shop', async (req, res) => {
  try {
    const { id } = req.params;
    const { shopId } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'not_found' });
    user.shops = shopId ? [shopId] : [];
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('assign shop', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

module.exports = router;
