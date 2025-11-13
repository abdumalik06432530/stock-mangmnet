const Item = require('../models/Item');
const Product = require('../models/Product');

// Helper: keep in sync with routes/product.js
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

async function computeProductQuantity(product) {
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
        if (product.subCategory) query.model = product.subCategory;
        else query.model = product.name;
      }
      const item = await Item.findOne(query).lean();
      const itemQty = (item && Number(item.quantity || 0)) || 0;
      available.push(Math.floor(itemQty / reqPerProduct));
    }
    if (available.length === 0) return 0;
    return Math.min(...available);
  } catch (err) {
    console.error('computeProductQuantity (admin) error', err);
    return product.quantity || 0;
  }
}

// POST /api/admin/products/add
async function add(req, res) {
  try {
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

    if (accessoryQuantities && typeof accessoryQuantities === 'object') {
      for (const [label, rawQty] of Object.entries(accessoryQuantities)) {
        const qty = Number(rawQty || 0);
        if (!qty || qty <= 0) continue;
        const itemType = mapNameToType(label);
        let query = { type: itemType };
        if (itemType === 'back') {
          query.model = subCategory ? subCategory : finalName;
        }
        let item = await Item.findOne(query).exec();
        if (item) {
          item.quantity = (item.quantity || 0) + qty;
          await item.save();
        } else {
          const newItem = new Item({
            type: itemType,
            model: itemType === 'back' ? (query.model || '') : undefined,
            furnitureType: category === 'Chair' ? 'chair' : undefined,
            quantity: qty,
            optional: false
          });
          await newItem.save();
        }
      }
    }

    await prod.save();
    try {
      const computed = await computeProductQuantity(prod);
      prod.quantity = computed;
      await prod.save();
    } catch {}
    return res.json({ success: true, message: 'Product created', product: prod });
  } catch (err) {
    console.error('admin add product error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

// GET/POST /api/admin/products/list
async function list(_req, res) {
  try {
    const products = await Product.find().lean();
    return res.json({ success: true, products });
  } catch (err) {
    console.error('admin list products error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

// PUT /api/admin/products/:id
async function update(req, res) {
  try {
    const { id } = req.params;
    const update = req.body || {};
    const prod = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    try {
      const computed = await computeProductQuantity(prod);
      prod.quantity = computed;
      await prod.save();
    } catch {}
    return res.json({ success: true, product: prod });
  } catch (err) {
    console.error('admin update product error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

// DELETE /api/admin/products/:id
async function remove(req, res) {
  try {
    const { id } = req.params;
    const prod = await Product.findByIdAndDelete(id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('admin delete product error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

// POST /api/admin/products/update-quantity
async function updateQuantity(req, res) {
  try {
    const { id, quantity } = req.body;
    const prod = await Product.findById(id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    prod.quantity = Number(quantity || 0);
    await prod.save();
    return res.json({ success: true, message: 'Quantity updated', product: prod });
  } catch (err) {
    console.error('admin product update-quantity error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

// POST /api/admin/products/update-accessories
async function updateAccessories(req, res) {
  try {
    const { id, accessoryQuantities } = req.body;
    const prod = await Product.findById(id);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    prod.accessoryQuantities = accessoryQuantities || {};
    // update/create items as absolute values
    for (const [label, rawQty] of Object.entries(prod.accessoryQuantities)) {
      const qty = Number(rawQty || 0);
      const itemType = mapNameToType(label);
      let query = { type: itemType };
      if (itemType === 'back') {
        query.model = prod.subCategory ? prod.subCategory : prod.name;
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
        await newItem.save();
      }
    }
    try {
      const computed = await computeProductQuantity(prod);
      prod.quantity = computed;
    } catch {}
    await prod.save();
    return res.json({ success: true, message: 'Accessories updated', product: prod });
  } catch (err) {
    console.error('admin product update-accessories error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

module.exports = {
  add,
  list,
  update,
  remove,
  updateQuantity,
  updateAccessories,
};
