const Product = require('../models/Product');
const Item = require('../models/Item');

// GET factory stock: products + accessory items (global, not shop-specific)
async function listStock(req, res) {
  try {
    const [products, items] = await Promise.all([
      Product.find().lean(),
      Item.find({ shop: null }).lean(),
    ]);
    return res.json({ success: true, products, items });
  } catch (err) {
    console.error('factory listStock error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

// PUT factory stock item (currently supports updating Product fields like name/description)
async function updateStockItem(req, res) {
  try {
    const { id } = req.params;
    const update = req.body || {};
    const prod = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!prod) return res.status(404).json({ success: false, message: 'not_found' });
    return res.json({ success: true, product: prod });
  } catch (err) {
    console.error('factory updateStockItem error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

module.exports = { listStock, updateStockItem };
