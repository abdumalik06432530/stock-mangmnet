const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const Item = require('../models/Item');

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

// GET /api/shops/:shopId/stock - return aggregated stock data (based on Item collection)
router.get('/:shopId/stock', async (req, res) => {
  try {
    // Return shop-specific finished product stock aggregated by type/model
    const items = await Item.find({ shop: req.params.shopId, type: 'product' }).lean();
    const stock = {};
    items.forEach((it) => {
      const key = it.model ? `${it.type}_${it.model}` : it.type;
      stock[key] = it.quantity || 0;
    });
    return res.json({ success: true, stock });
  } catch (err) {
    console.error('shop stock error', err);
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
// GET /api/shops/:shopId/orders - list orders for a given shop
router.get('/:shopId/orders', async (req, res) => {
  try {
    const { shopId } = req.params;
    const orders = await Order.find({ shop: shopId }).sort({ _id: -1 }).lean();
    return res.json({ success: true, orders });
  } catch (err) {
    console.error('shop orders error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

module.exports = router;
