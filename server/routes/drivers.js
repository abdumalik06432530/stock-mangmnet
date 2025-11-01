const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');

// GET /api/drivers - list drivers
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, drivers });
  } catch (err) {
    console.error('drivers list error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// POST /api/drivers - create driver
router.post('/', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name_required' });
    const driver = new Driver({ name: name.trim(), phone: phone || '' });
    await driver.save();
    res.json({ success: true, driver });
  } catch (err) {
    console.error('create driver error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// PUT /api/drivers/:id - update driver
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};
    const driver = await Driver.findByIdAndUpdate(id, patch, { new: true }).lean();
    if (!driver) return res.status(404).json({ success: false, message: 'not_found' });
    res.json({ success: true, driver });
  } catch (err) {
    console.error('update driver error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// DELETE /api/drivers/:id - delete driver
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Driver.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error('delete driver error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

module.exports = router;
