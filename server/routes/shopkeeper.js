const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const shopOrders = require('../controllers/shopOrdersController');
const shopSales = require('../controllers/shopSalesController');
const shopStock = require('../controllers/shopStockController');

// Place order(s) to factory (proxy to existing orders controller)
router.post('/orders', shopOrders.createOrders);

// Mark order as delivered (shop receives delivery) - updates order status and shop product stock
router.post('/orders/:id/deliver', shopOrders.markDelivered);
// Backfill delivered orders into shop stock (admin/shopkeeper maintenance action)
router.post('/orders/backfill-delivered', shopOrders.backfillDelivered);

// Record a sale for the shop: decrements shop stock only
router.post('/sales', shopSales.createSale);

// Get shop visible stock (returns products and quantities)
router.get('/stock', shopStock.getStock);

// GET /api/shopkeeper/sales - list sales for a shop (optional query ?shop=shopId)
router.get('/sales', shopSales.listSales);

// DELETE /api/shopkeeper/sales/:id - cancel/delete a sale (restore product qty)
router.delete('/sales/:id', shopSales.deleteSale);

// Create item request to admins for replenishment
router.post('/requests', shopStock.requestItem);

module.exports = router;
