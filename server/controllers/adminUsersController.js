const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Shop = require('../models/Shop');

async function list(_req, res) {
  try {
    const users = await User.find().lean();
    const shopIds = Array.from(new Set(users.flatMap(u => u.shops || [])));
    const shops = await Shop.find({ _id: { $in: shopIds } }).lean();
    const shopMap = new Map(shops.map(s => [String(s._id), s]));
    const enriched = users.map(u => ({ ...u, shopId: (u.shops && u.shops[0]) ? shopMap.get(String(u.shops[0])) : null }));
    return res.json({ success: true, users: enriched });
  } catch (err) {
    console.error('admin users list error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function create(req, res) {
  try {
    const { username, password, name, role, phone, shopId } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'username and password required' });
    const existing = await User.findOne({ username }).exec();
    if (existing) return res.status(400).json({ success: false, message: 'username already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, name, role: role || 'shopkeeper', phone });
    if (shopId) user.shops = [shopId];
    await user.save();
    return res.json({ success: true, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('admin user create error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, role, phone, password, shopId } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'not_found' });
    if (password) user.password = await bcrypt.hash(password, 10);
    if (name) user.name = name;
    if (role) user.role = role;
    if (phone) user.phone = phone;
    if (shopId !== undefined) user.shops = shopId ? [shopId] : [];
    await user.save();
    return res.json({ success: true });
  } catch (err) {
    console.error('admin user update error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin user delete error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function setStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'not_found' });
    user.status = isActive ? 'active' : 'inactive';
    await user.save();
    return res.json({ success: true });
  } catch (err) {
    console.error('admin user status error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function assignShop(req, res) {
  try {
    const { id } = req.params;
    const { shopId } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'not_found' });
    user.shops = shopId ? [shopId] : [];
    await user.save();
    return res.json({ success: true });
  } catch (err) {
    console.error('admin user assign shop error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

module.exports = { list, create, update, remove, setStatus, assignShop };
