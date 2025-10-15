const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

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
