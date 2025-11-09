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
        // Also increment shop-specific finished-product stock (create Item of type 'product')
        try {
          if (order.shop) {
            const shopProduct = await Item.findOne({ type: 'product', model: prod.model || prod.subCategory || prod.name, shop: order.shop });
            if (shopProduct) {
              shopProduct.quantity = (shopProduct.quantity || 0) + (order.quantity || 0);
              await shopProduct.save();
            } else {
              const it = new Item({ type: 'product', model: prod.model || prod.subCategory || prod.name, furnitureType: prod.category || '', quantity: order.quantity || 0, shop: order.shop });
              await it.save();
            }
          }
        } catch (e) {
          console.error('failed to update shop product stock', e);
        }
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
      // Prefer shop-specific Item stock when shop is provided
      if (shop) {
        // Try to resolve Item by id first
        let item = null;
        if (productId) {
          item = await Item.findById(productId);
          if (item && String(item.shop) !== String(shop)) item = null; // ignore if not matching shop
        }
        if (!item && productModel) {
          item = await Item.findOne({ shop, model: productModel });
        }

        if (item) {
          if ((item.quantity || 0) < qty) return res.status(400).json({ success: false, message: 'insufficient_stock' });
          item.quantity -= qty;
          await item.save();
          const sale = new Sale({ shop, product: null, productModel: item.model || productModel, quantity: qty, customerName, customerPhone, customerAddress });
          await sale.save();
          return res.json({ success: true, sale, item });
        }
        // otherwise fallthrough to global Product check
      }

      // Fallback: use global Product stock
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
    const { shop } = req.query;
    // Always return Items collection for shop-visible stock. If `shop` is
    // provided, filter Items by shop. Avoid reading from the global Product
    // collection here because each shop maintains its own visible Item
    // records (delivered finished products are created as Item documents
    // tied to the receiving shop).
    const query = {};
    if (shop) {
      query.shop = shop;
      // Only expose finished products to shops (hide accessory/component stocks)
      query.type = 'product';
    }
    const items = await Item.find(query).lean();
    return res.json({ success: true, items });
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

    // restore product or shop item quantity if referenced
    if (sale.product) {
      const prod = await Product.findById(sale.product);
      if (prod) {
        prod.quantity = (prod.quantity || 0) + (sale.quantity || 0);
        await prod.save();
      }
    } else if (sale.productModel) {
      // prefer restoring shop Item if sale.shop is present
      if (sale.shop) {
        const item = await Item.findOne({ shop: sale.shop, model: sale.productModel });
        if (item) {
          item.quantity = (item.quantity || 0) + (sale.quantity || 0);
          await item.save();
        } else {
          // fallback to global product
          const prod = await Product.findOne({ $or: [{ model: sale.productModel }, { subCategory: sale.productModel }, { name: sale.productModel }] });
          if (prod) {
            prod.quantity = (prod.quantity || 0) + (sale.quantity || 0);
            await prod.save();
          }
        }
      } else {
        const prod = await Product.findOne({ $or: [{ model: sale.productModel }, { subCategory: sale.productModel }, { name: sale.productModel }] });
        if (prod) {
          prod.quantity = (prod.quantity || 0) + (sale.quantity || 0);
          await prod.save();
        }
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
