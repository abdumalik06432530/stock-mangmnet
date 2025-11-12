const Item = require('../models/Item');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const PendingItem = require('../models/PendingItem');

// Shopkeepers can sell only their own shop stock (Item type 'product').
async function createSale(req, res) {
  try {
    const { shop, itemId, productModel, quantity, customerName, customerPhone, customerAddress, requestIfInsufficient } = req.body;
    const qty = Number(quantity || 0);
    if (!shop) return res.status(400).json({ success: false, message: 'shop_required' });
    if (!qty || qty <= 0) return res.status(400).json({ success: false, message: 'invalid_quantity' });

    // Resolve the shop's item stock
    let item = null;
    if (itemId) {
      item = await Item.findById(itemId);
      if (!item || String(item.shop) !== String(shop)) item = null;
    }
    if (!item && productModel) {
      item = await Item.findOne({ shop, type: 'product', model: productModel });
    }

    if (!item) {
      if (requestIfInsufficient) {
        await PendingItem.create({ type: 'product', model: productModel, furnitureType: 'chair', quantity: qty, requester: shop, shop });
      }
      return res.status(404).json({ success: false, message: 'shop_item_not_found' });
    }

    if ((item.quantity || 0) < qty) {
      if (requestIfInsufficient) {
        await PendingItem.create({ type: 'product', model: item.model || productModel, furnitureType: item.furnitureType || 'chair', quantity: qty - (item.quantity || 0), requester: shop, shop });
      }
      return res.status(400).json({ success: false, message: 'insufficient_stock' });
    }

    item.quantity -= qty;
    await item.save();

    const sale = new Sale({ shop, product: null, productModel: item.model || productModel, quantity: qty, customerName, customerPhone, customerAddress });
    await sale.save();

    return res.json({ success: true, sale, item });
  } catch (err) {
    console.error('createSale error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function listSales(req, res) {
  try {
    const { shop } = req.query;
    const query = {};
    if (shop) query.shop = shop;
    const sales = await Sale.find(query).sort({ createdAt: -1 }).populate('product').lean();
    return res.json({ success: true, sales });
  } catch (err) {
    console.error('listSales error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

async function deleteSale(req, res) {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id);
    if (!sale) return res.status(404).json({ success: false, message: 'sale_not_found' });

    // Restore shop Item quantity when possible, else fallback to Product
    if (sale.shop && sale.productModel) {
      const item = await Item.findOne({ shop: sale.shop, model: sale.productModel });
      if (item) {
        item.quantity = (item.quantity || 0) + (sale.quantity || 0);
        await item.save();
      } else {
        const prod = await Product.findOne({ $or: [{ model: sale.productModel }, { subCategory: sale.productModel }, { name: sale.productModel }] });
        if (prod) {
          prod.quantity = (prod.quantity || 0) + (sale.quantity || 0);
          await prod.save();
        }
      }
    } else if (sale.product) {
      const prod = await Product.findById(sale.product);
      if (prod) {
        prod.quantity = (prod.quantity || 0) + (sale.quantity || 0);
        await prod.save();
      }
    }

    await sale.remove();
    return res.json({ success: true, message: 'sale_deleted' });
  } catch (err) {
    console.error('deleteSale error', err);
    return res.status(500).json({ success: false, message: 'server_error' });
  }
}

module.exports = { createSale, listSales, deleteSale };
