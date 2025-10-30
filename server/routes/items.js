const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const PendingItem = require('../models/PendingItem');

// POST /api/items/request - request a new item (shopkeeper/users)
router.post('/request', async (req, res) => {
  try {
    const { type, model, furnitureType, quantity, optional, requester } = req.body;
    if (!type) return res.status(400).json({ success: false, message: 'type required' });
    const p = new PendingItem({ type, model, furnitureType, quantity: Number(quantity || 0), optional: !!optional, requester });
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

    // find existing item and add quantity or create
    let existing;
    if (pending.type === 'back' && pending.model) {
      existing = await Item.findOne({ type: 'back', model: pending.model, furnitureType: pending.furnitureType || 'chair' });
    } else {
      existing = await Item.findOne({ type: pending.type });
    }

    if (existing) {
      existing.quantity = (existing.quantity || 0) + (pending.quantity || 0);
      await existing.save();
    } else {
      const it = new Item({ type: pending.type, model: pending.model, furnitureType: pending.furnitureType, quantity: pending.quantity || 0, optional: pending.optional });
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

// GET /api/items
router.get('/', async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

// POST /api/items - create or add quantity
router.post('/', async (req, res) => {
  const { type, model, furnitureType, quantity, optional } = req.body;
  try {
    if (type === 'back' && model) {
      let existing = await Item.findOne({ type: 'back', model: model, furnitureType: furnitureType || 'chair' });
      if (existing) {
        existing.quantity += Number(quantity || 0);
        await existing.save();
        return res.json(existing);
      }
    } else {
      let existing = await Item.findOne({ type });
      if (existing) {
        existing.quantity += Number(quantity || 0);
        await existing.save();
        return res.json(existing);
      }
    }

    const item = new Item({ type, model, furnitureType, quantity: Number(quantity || 0), optional: !!optional });
    await item.save();
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
