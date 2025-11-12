const Item = require('../models/Item');
const PendingItem = require('../models/PendingItem');

async function getStock(req, res) {
  try {
    const { shop } = req.query;
    const query = {};
    if (shop) {
      query.shop = shop;
      query.type = 'product';
    }
    const items = await Item.find(query).lean();
    return res.json({ success: true, items });
  } catch (err) {
    console.error('getStock error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

// Shopkeeper can request items to admin for replenishment
async function requestItem(req, res) {
  try {
    const { shop, type = 'product', model, furnitureType = 'chair', quantity = 1, optional = false, requester } = req.body;
    if (!shop) return res.status(400).json({ success: false, message: 'shop_required' });
    if (!model) return res.status(400).json({ success: false, message: 'model_required' });
    const qty = Number(quantity || 0);
    if (!qty || qty <= 0) return res.status(400).json({ success: false, message: 'invalid_quantity' });

    const pending = await PendingItem.create({ type, model, furnitureType, quantity: qty, optional, requester: requester || shop, shop });
    return res.json({ success: true, request: pending });
  } catch (err) {
    console.error('requestItem error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

module.exports = { getStock, requestItem };
