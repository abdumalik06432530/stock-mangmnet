// Quick simulation script: create order, mark delivered, create sale, request item.
// Assumes Mongo connection already established by requiring server.js or similar.
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Item = require('../models/Item');
const Sale = require('../models/Sale');
const PendingItem = require('../models/PendingItem');
const Product = require('../models/Product');
const { createOrders } = require('../controllers/ordersController');

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stock';
  await mongoose.connect(mongoUri);
  const shopId = 'SHOP-TEST';

  // Seed a back model item and components if missing
  const ensureItem = async (type, model, qty) => {
    let q = { type };
    if (model) q.model = model;
    let it = await Item.findOne(q);
    if (!it) {
      it = new Item({ type, model, quantity: qty });
    } else {
      it.quantity = Math.max(it.quantity, qty);
    }
    await it.save();
  };

  await ensureItem('back', 'MODEL-X', 50);
  for (const comp of ['seat','arm','mechanism','gaslift','castor','chrome','headrest']) {
    await ensureItem(comp, null, 100);
  }

  // Create an order via controller
  const mockReq = { body: { shop: shopId, backModel: 'MODEL-X', quantity: 5, furnitureType: 'chair' } };
  const mockRes = { json: (d) => { console.log('createOrders response', JSON.stringify(d)); }, status: (c) => ({ json: (d) => console.log('createOrders error', c, d) }) };
  await createOrders(mockReq, mockRes);

  const order = await Order.findOne({ shop: shopId }).sort({ createdAt: -1 });
  if (!order) throw new Error('Order not created');
  order.status = 'delivered';
  order.deliveredAt = new Date();
  await order.save();

  // Stock update on delivery: simulate logic from shopOrdersController
  const prod = await Product.findOne({ $or: [{ model: order.backModel }, { subCategory: order.backModel }, { name: order.backModel }] });
  if (prod) {
    prod.quantity = (prod.quantity || 0) + order.quantity;
    await prod.save();
  }
  let shopItem = await Item.findOne({ type: 'product', model: order.backModel, shop: shopId });
  if (!shopItem) {
    shopItem = new Item({ type: 'product', model: order.backModel, quantity: order.quantity, shop: shopId });
  } else {
    shopItem.quantity += order.quantity;
  }
  await shopItem.save();
  console.log('Post-delivery shop item qty', shopItem.quantity);

  // Create sale consuming shop stock
  if (shopItem.quantity >= 2) {
    shopItem.quantity -= 2;
    await shopItem.save();
    const sale = new Sale({ shop: shopId, productModel: shopItem.model, quantity: 2 });
    await sale.save();
    console.log('Sale recorded; remaining qty', shopItem.quantity);
  }

  // Request replenishment
  const pending = new PendingItem({ type: 'product', model: shopItem.model, quantity: 10, requester: shopId, shop: shopId });
  await pending.save();
  console.log('Pending request created', pending._id.toString());

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
