const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Item = require('../models/Item');
const Sale = require('../models/Sale');

// Place order(s) to factory (proxy to existing orders controller)
router.post('/orders', ordersController.createOrders);

// Mark order as delivered (shop receives delivery) - updates order status and shop product stock
router.post('/orders/:id/deliver', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // mark delivered
    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();

    // If the order corresponds to a product model/backModel, increment finished product stock
    if (order.backModel) {
      const prod = await Product.findOne({ $or: [{ subCategory: order.backModel }, { model: order.backModel }, { name: order.backModel }] });
      if (prod) {
        prod.quantity = (prod.quantity || 0) + (order.quantity || 0);
        await prod.save();
      }
    }

    return res.json({ success: true, order });
  } catch (err) {
    console.error('shopkeeper deliver error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// Record a sale for the shop: decrements product finished stock and records sale
router.post('/sales', async (req, res) => {
  try {
    const { shop, productId, productModel, quantity, customerName, customerPhone, customerAddress } = req.body;
    const qty = Number(quantity || 0);
    if (!qty || qty <= 0) return res.status(400).json({ success: false, message: 'invalid_quantity' });

    let prod = null;
    if (productId) prod = await Product.findById(productId);
    else if (productModel) prod = await Product.findOne({ $or: [{ model: productModel }, { subCategory: productModel }, { name: productModel }] });
    if (!prod) return res.status(404).json({ success: false, message: 'product_not_found' });

    if ((prod.quantity || 0) < qty) return res.status(400).json({ success: false, message: 'insufficient_stock' });

    prod.quantity -= qty;
    await prod.save();

    const sale = new Sale({ shop, product: prod._id, productModel: prod.model || prod.name, quantity: qty, customerName, customerPhone, customerAddress });
    await sale.save();

    return res.json({ success: true, sale, product: prod });
  } catch (err) {
    console.error('shopkeeper sales error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// Get shop visible stock (returns products and quantities)
router.get('/stock', async (req, res) => {
  try {
    const products = await Product.find().lean();
    return res.json({ success: true, products });
  } catch (err) {
    console.error('shopkeeper stock error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// GET /api/shopkeeper/sales - list sales for a shop (optional query ?shop=shopId)
router.get('/sales', async (req, res) => {
  try {
    const { shop } = req.query;
    const query = {};
    if (shop) query.shop = shop;
    const sales = await Sale.find(query).sort({ createdAt: -1 }).populate('product').lean();
    return res.json({ success: true, sales });
  } catch (err) {
    console.error('shopkeeper list sales error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

// DELETE /api/shopkeeper/sales/:id - cancel/delete a sale (restore product qty)
router.delete('/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id);
    if (!sale) return res.status(404).json({ success: false, message: 'sale_not_found' });

    // restore product quantity if referenced
    if (sale.product) {
      const prod = await Product.findById(sale.product);
      if (prod) {
        prod.quantity = (prod.quantity || 0) + (sale.quantity || 0);
        await prod.save();
      }
    } else if (sale.productModel) {
      const prod = await Product.findOne({ $or: [{ model: sale.productModel }, { subCategory: sale.productModel }, { name: sale.productModel }] });
      if (prod) {
        prod.quantity = (prod.quantity || 0) + (sale.quantity || 0);
        await prod.save();
      }
    }

    await sale.remove();
    return res.json({ success: true, message: 'sale_deleted' });
  } catch (err) {
    console.error('delete sale error', err);
    res.status(500).json({ success: false, message: 'server_error' });
  }
});

module.exports = router;
