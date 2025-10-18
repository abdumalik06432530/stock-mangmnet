const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');

// GET /api/shops
router.get('/', async (req, res) => {
  try {
    const shops = await Shop.find().lean();
    res.json({ success: true, shops });
  } catch (err) {
    console.error('shops list', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// POST /api/shops - create a shop
router.post('/', async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const shop = new Shop({ name, address });
    await shop.save();
    res.json({ success: true, shop });
  } catch (err) {
    console.error('create shop', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

module.exports = router;
