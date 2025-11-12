const Order = require('../models/Order');
const Item = require('../models/Item');
const Product = require('../models/Product');
const ordersController = require('./ordersController');

// Proxy to existing order creation supporting shopkeeper payloads
async function createOrders(req, res) {
  return ordersController.createOrders(req, res);
}

// Mark order delivered and update shop-specific finished product stock
async function markDelivered(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'order_not_found' });

    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();

    // Update global finished product quantity (optional) and ensure shop Item exists and incremented
    let updatedShopItem = null;
    if (order.backModel) {
      const prod = await Product.findOne({ $or: [
        { subCategory: order.backModel },
        { model: order.backModel },
        { name: order.backModel }
      ] });
      if (prod) {
        prod.quantity = (prod.quantity || 0) + (order.quantity || 0);
        await prod.save();
      }

      if (order.shop) {
        // Maintain shop-visible stock as Item documents of type 'product'
        const modelKey = (prod && (prod.model || prod.subCategory || prod.name)) || order.backModel;
        let item = await Item.findOne({ type: 'product', model: modelKey, shop: order.shop });
        if (!item) {
          item = new Item({ type: 'product', model: modelKey, furnitureType: prod?.category || 'chair', quantity: 0, shop: order.shop });
        }
        item.quantity = (item.quantity || 0) + (order.quantity || 0);
        await item.save();
        updatedShopItem = item;
      }
    }

    return res.json({ success: true, order, item: updatedShopItem });
  } catch (err) {
    console.error('markDelivered error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

// Backfill: ensure all delivered orders are reflected as shop Item stocks
async function backfillDelivered(req, res) {
  try {
    const { shop } = req.body; // optional filter
    const q = { status: 'delivered' };
    if (shop) q.shop = shop;
    const orders = await Order.find(q).lean();
    let updated = 0;
    for (const o of orders) {
      if (!o.shop) continue;
      const furnitureKey = (o.furnitureType || o.type || '').toString().toLowerCase();
      const finishedTypes = ['chair', 'chairs', 'table', 'tables', 'shelf', 'shelves', 'cabinet', 'desk'];
      if (!finishedTypes.includes(furnitureKey)) continue;
      const model = o.backModel || o.model || o.type || o.furnitureType || 'finished';
      const query = { shop: o.shop, model };
      const update = {
        $inc: { quantity: Number(o.quantity || 0) },
        $setOnInsert: { type: 'product', model, furnitureType: o.furnitureType || o.type, shop: o.shop }
      };
      const opts = { upsert: true };
      await Item.updateOne(query, update, opts);
      updated += 1;
    }
    return res.json({ success: true, updated, count: orders.length });
  } catch (err) {
    console.error('backfillDelivered error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

module.exports = { createOrders, markDelivered, backfillDelivered };
