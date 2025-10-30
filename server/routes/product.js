const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Product = require('../models/Product');

// GET /api/product/list
router.get('/list', async (req, res) => {
  try {
    // Prefer products collection; fallback to items if empty
    const products = await Product.find().lean();
    if (products && products.length > 0) return res.json({ success: true, products });
    const items = await Item.find().lean();
    return res.json({ success: true, products: items });
  } catch (err) {
    console.error('product list error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// POST /api/product/list (allow POST from frontend)
router.post('/list', async (req, res) => {
  try {
    const products = await Product.find().lean();
    if (products && products.length > 0) return res.json({ success: true, products });
    const items = await Item.find().lean();
    return res.json({ success: true, products: items });
  } catch (err) {
    console.error('product list (post) error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// POST /api/product/add - create a product (frontend Add.jsx posts here)
router.post('/add', async (req, res) => {
  try {
    // Expect JSON body (frontend should send JSON)
    const { name, model, description, category, subCategory, type, accessoryQuantities } = req.body;
    const finalName = name || model || 'Unnamed Product';
    const prod = new Product({
      name: finalName,
      model: model || name || finalName,
      description,
      category,
      subCategory,
      type,
      accessoryQuantities: accessoryQuantities || {},
      quantity: 0
    });

    // If accessoryQuantities provided, update/create corresponding Item records
    let accessoriesUpdated = [];
    if (accessoryQuantities && typeof accessoryQuantities === 'object') {
      // helper mapping from friendly name to item.type in Item model
      const mapNameToType = (raw) => {
        if (!raw) return raw;
        const k = String(raw).toLowerCase().trim();
        if (k === 'arm') return 'arm';
        if (k === 'mechanism') return 'mechanism';
        if (k === 'headrest') return 'headrest';
        if (k === 'castor') return 'castor';
        if (k === 'chrome') return 'chrome';
        if (k === 'gas lift' || k === 'gaslift') return 'gaslift';
        if (k === 'chair back' || k === 'chairback' || k === 'back') return 'back';
        if (k === 'cup holder' || k === 'cupholder') return 'cupholder';
        // default fallback: remove spaces
        return k.replace(/\s+/g, '_');
      };

      for (const [label, rawQty] of Object.entries(accessoryQuantities)) {
        const qty = Number(rawQty || 0);
        if (!qty || qty <= 0) continue;
        const itemType = mapNameToType(label);

        try {
          // If it's a 'back' type, try to use subCategory or product name as model
          let query = { type: itemType };
          if (itemType === 'back') {
            if (subCategory) query.model = subCategory;
            else query.model = name;
          }

          let item = await Item.findOne(query).exec();
          if (item) {
            item.quantity = (item.quantity || 0) + qty;
            await item.save();
          } else {
            // create a new Item entry
            const newItem = new Item({
              type: itemType,
              model: itemType === 'back' ? (query.model || '') : undefined,
              furnitureType: category === 'Chair' ? 'chair' : undefined,
              quantity: qty,
              optional: false
            });
            item = await newItem.save();
          }
          accessoriesUpdated.push({ label, type: itemType, updatedQuantity: item.quantity });
        } catch (ee) {
          console.error('accessory update error', label, ee);
        }
      }
    }

    await prod.save();
    return res.json({ success: true, message: 'Product created', product: prod, accessoriesUpdated });
  } catch (err) {
    console.error('product add error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// DELETE /api/product/:id - delete a product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prod = await Product.findByIdAndDelete(id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('product delete error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// PUT /api/product/:id - edit a product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const prod = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, product: prod });
  } catch (err) {
    console.error('product edit error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// GET /api/product/:id - get product details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prod = await Product.findById(id).lean();
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json(prod);
  } catch (err) {
    console.error('product get error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// Accessories CRUD for a product
// POST /api/product/:id/accessory - add accessory
router.post('/:id/accessory', async (req, res) => {
  try {
    const { id } = req.params;
    const { model, quantity } = req.body;
    const prod = await Product.findById(id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    prod.accessoryQuantities = prod.accessoryQuantities || {};
    prod.accessoryQuantities[model] = quantity;
    await prod.save();
    return res.json(prod.accessoryQuantities[model]);
  } catch (err) {
    console.error('add accessory error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// PUT /api/product/:id/accessory/:accId - edit accessory
router.put('/:id/accessory/:accId', async (req, res) => {
  try {
    const { id, accId } = req.params;
    const { model, quantity } = req.body;
    const prod = await Product.findById(id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    prod.accessoryQuantities = prod.accessoryQuantities || {};
    prod.accessoryQuantities[model] = quantity;
    await prod.save();
    return res.json({ model, quantity });
  } catch (err) {
    console.error('edit accessory error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// DELETE /api/product/:id/accessory/:accId - delete accessory
router.delete('/:id/accessory/:accId', async (req, res) => {
  try {
    const { id, accId } = req.params;
    const prod = await Product.findById(id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    if (prod.accessoryQuantities && prod.accessoryQuantities[accId] !== undefined) {
      delete prod.accessoryQuantities[accId];
      await prod.save();
      return res.json({ success: true });
    }
    return res.status(404).json({ success: false, message: 'Accessory not found' });
  } catch (err) {
    console.error('delete accessory error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

module.exports = router;
