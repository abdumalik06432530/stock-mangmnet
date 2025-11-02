const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const PendingItem = require('../models/PendingItem');

// POST /api/items/request - request a new item (shopkeeper/users)
router.post('/request', async (req, res) => {
  try {
    const { type, model, furnitureType, quantity, optional, requester, shop } = req.body;
    if (!type) return res.status(400).json({ success: false, message: 'type required' });
    const p = new PendingItem({ type, model, furnitureType, quantity: Number(quantity || 0), optional: !!optional, requester, shop: shop || null });
    await p.save();
    return res.json({ success: true, request: p });
  } catch (err) {
    console.error('request item error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// GET /api/items/requests - admin list of pending requests
router.get('/requests', async (req, res) => {
  try {
    const list = await PendingItem.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, requests: list });
  } catch (err) {
    console.error('pending requests error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// PUT /api/items/requests/:id/approve - approve and create/add to Item
router.put('/requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const pending = await PendingItem.findById(id);
    if (!pending) return res.status(404).json({ success: false, message: 'request not found' });

    // If the pending request is for a specific shop, create/update shop-specific Item
    const shopId = pending.shop || null;

    // find existing item and add quantity or create
    let existing;
    if (pending.type === 'back' && pending.model) {
      existing = await Item.findOne({ type: 'back', model: pending.model, furnitureType: pending.furnitureType || 'chair', shop: shopId });
    } else {
      existing = await Item.findOne({ type: pending.type, shop: shopId });
    }

    if (existing) {
      existing.quantity = (existing.quantity || 0) + (pending.quantity || 0);
      await existing.save();
    } else {
      const it = new Item({ type: pending.type, model: pending.model, furnitureType: pending.furnitureType, quantity: pending.quantity || 0, optional: pending.optional, shop: shopId });
      await it.save();
    }

    pending.status = 'approved';
    await pending.save();
    return res.json({ success: true, approved: pending });
  } catch (err) {
    console.error('approve request error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// PUT /api/items/requests/:id/reject - reject request
router.put('/requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const pending = await PendingItem.findById(id);
    if (!pending) return res.status(404).json({ success: false, message: 'request not found' });
    pending.status = 'rejected';
    pending.adminNotes = adminNotes || '';
    await pending.save();
    return res.json({ success: true, rejected: pending });
  } catch (err) {
    console.error('reject request error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// GET /api/items - optional query ?shop=shopId to list shop-specific items; otherwise returns global items
router.get('/', async (req, res) => {
  try {
    const { shop } = req.query;
    const q = {};
    if (shop) q.shop = shop;
    else q.shop = null; // default to global items only
    const items = await Item.find(q).lean();
    return res.json({ success: true, items });
  } catch (err) {
    console.error('items list error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// POST /api/items - create or add quantity. Supports optional `shop` in body to create shop-specific items.
router.post('/', async (req, res) => {
  const { type, model, furnitureType, quantity, optional, shop } = req.body;
  try {
    const shopId = shop || null;
    if (type === 'back' && model) {
      let existing = await Item.findOne({ type: 'back', model: model, furnitureType: furnitureType || 'chair', shop: shopId });
      if (existing) {
        existing.quantity += Number(quantity || 0);
        await existing.save();
        return res.json({ success: true, item: existing });
      }
    } else {
      let existing = await Item.findOne({ type, shop: shopId });
      if (existing) {
        existing.quantity += Number(quantity || 0);
        await existing.save();
        return res.json({ success: true, item: existing });
      }
    }

    const item = new Item({ type, model, furnitureType, quantity: Number(quantity || 0), optional: !!optional, shop: shopId });
    await item.save();
    res.json({ success: true, item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

module.exports = router;
