const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Product = require('../models/Product');

// Helper: map friendly accessory label to Item.type
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
  return k.replace(/\s+/g, '_');
};

// Compute available product quantity based on accessory Item stocks and per-product requirements
const computeProductQuantity = async (product) => {
  try {
    if (!product) return 0;
    const acc = product.accessoryQuantities || {};
    const labels = Object.keys(acc);
    if (!labels || labels.length === 0) return product.quantity || 0;

    const available = [];

    for (const label of labels) {
      const reqPerProduct = Number(acc[label] || 1) || 1;
      const type = mapNameToType(label);
      let query = { type };
      if (type === 'back') {
        // prefer subCategory or product name as model
        if (product.subCategory) query.model = product.subCategory;
        else query.model = product.name;
      }
      const item = await Item.findOne(query).lean();
      const itemQty = (item && Number(item.quantity || 0)) || 0;
      // how many products can this accessory support
      const possible = Math.floor(itemQty / reqPerProduct);
      available.push(possible);
    }

    if (available.length === 0) return 0;
    return Math.min(...available);
  } catch (err) {
    console.error('computeProductQuantity error', err);
    return product.quantity || 0;
  }
};

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
    await prod.save();

    // compute and set product.quantity based on accessory Item stock
    try {
      const computed = await computeProductQuantity(prod);
      prod.quantity = computed;
      await prod.save();
    } catch (ee) {
      console.error('compute quantity after add error', ee);
    }

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
      // recompute quantity after update (in case accessoryQuantities or model changed)
      try {
        const computed = await computeProductQuantity(prod);
        prod.quantity = computed;
        await prod.save();
      } catch (ee) {
        console.error('compute quantity after edit error', ee);
      }

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
    // recompute product quantity
    try {
      const computed = await computeProductQuantity(prod);
      prod.quantity = computed;
      await prod.save();
    } catch (ee) {
      console.error('compute quantity after accessory add error', ee);
    }
    return res.json({ success: true, accessory: prod.accessoryQuantities[model], product: prod });
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
    // recompute product quantity
    try {
      const computed = await computeProductQuantity(prod);
      prod.quantity = computed;
      await prod.save();
    } catch (ee) {
      console.error('compute quantity after accessory edit error', ee);
    }

    return res.json({ success: true, model, quantity, product: prod });
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
        // recompute quantity after accessory removal
        try {
          const computed = await computeProductQuantity(prod);
          prod.quantity = computed;
          await prod.save();
        } catch (ee) {
          console.error('compute quantity after accessory delete error', ee);
        }
        return res.json({ success: true, product: prod });
    }
    return res.status(404).json({ success: false, message: 'Accessory not found' });
  } catch (err) {
    console.error('delete accessory error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// POST /api/product/update-quantity - update main product quantity (body: { id, quantity })
router.post('/update-quantity', async (req, res) => {
  try {
    const { id, quantity } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'missing_id' });
    const qty = Number(quantity || 0);
    if (isNaN(qty) || qty < 0) return res.status(400).json({ success: false, message: 'invalid_quantity' });

    const prod = await Product.findById(id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });

    prod.quantity = qty;
    await prod.save();

    return res.json({ success: true, message: 'Quantity updated', product: prod });
  } catch (err) {
    console.error('update quantity error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// POST /api/product/update-accessories - replace accessoryQuantities and update Item quantities
router.post('/update-accessories', async (req, res) => {
  try {
    const { id, accessoryQuantities } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'missing_id' });
    if (!accessoryQuantities || typeof accessoryQuantities !== 'object') return res.status(400).json({ success: false, message: 'invalid_accessories' });

    const prod = await Product.findById(id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });

    // Replace product accessory mapping
    prod.accessoryQuantities = accessoryQuantities;

    // For each accessory, set or create corresponding Item with the provided absolute quantity
    for (const [label, rawQty] of Object.entries(accessoryQuantities)) {
      const qty = Number(rawQty || 0);
      const itemType = mapNameToType(label);

      let query = { type: itemType };
      if (itemType === 'back') {
        if (prod.subCategory) query.model = prod.subCategory;
        else query.model = prod.name;
      }

      let item = await Item.findOne(query).exec();
      if (item) {
        item.quantity = qty;
        await item.save();
      } else {
        const newItem = new Item({
          type: itemType,
          model: itemType === 'back' ? (query.model || '') : undefined,
          furnitureType: prod.category === 'Chair' ? 'chair' : undefined,
          quantity: qty,
          optional: false
        });
        item = await newItem.save();
      }
    }

    // Recompute product.quantity based on updated Items
    try {
      const computed = await computeProductQuantity(prod);
      prod.quantity = computed;
    } catch (ee) {
      console.error('compute quantity after update-accessories error', ee);
    }

    await prod.save();

    return res.json({ success: true, message: 'Accessories updated', product: prod });
  } catch (err) {
    console.error('update accessories error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

  // POST /api/product/:id/sell - decrement product and related accessory Item stocks
  router.post('/:id/sell', async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      const qty = Number(quantity || 1);
      if (qty <= 0) return res.status(400).json({ success: false, message: 'invalid_quantity' });

      const prod = await Product.findById(id);
      if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });

      // compute required accessories
      const acc = prod.accessoryQuantities || {};
      const labels = Object.keys(acc);

      // gather items to update
      const updates = [];
      for (const label of labels) {
        const reqPerProduct = Number(acc[label] || 1) || 1;
        const requiredTotal = reqPerProduct * qty;
        const type = mapNameToType(label);
        let query = { type };
        if (type === 'back') {
          if (prod.subCategory) query.model = prod.subCategory;
          else query.model = prod.name;
        }
        const item = await Item.findOne(query);
        if (!item) {
          return res.status(400).json({ success: false, message: `missing accessory item for ${label}` });
        }
        if ((item.quantity || 0) < requiredTotal) {
          return res.status(400).json({ success: false, message: `insufficient ${label} stock` });
        }
        updates.push({ item, newQty: (item.quantity || 0) - requiredTotal });
      }

      // apply updates
      for (const u of updates) {
        u.item.quantity = u.newQty;
        await u.item.save();
      }

      // decrement product quantity
      prod.quantity = Math.max(0, (prod.quantity || 0) - qty);
      await prod.save();

      return res.json({ success: true, product: prod, updatedItems: updates.map(u => ({ type: u.item.type, model: u.item.model, quantity: u.item.quantity })) });
    } catch (err) {
      console.error('sell product error', err);
      res.status(500).json({ success: false, message: 'server_error' });
    }
  });

module.exports = router;
