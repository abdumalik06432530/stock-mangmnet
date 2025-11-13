const express = require('express');
const router = express.Router();
const factoryOrders = require('../controllers/factoryOrdersController');
const factoryStock = require('../controllers/factoryStockController');

// Orders management for factory managers
router.get('/orders', factoryOrders.listFactoryOrders);
router.get('/orders/:id', factoryOrders.getOrderDetails);
router.put('/orders/:id/processing', factoryOrders.setProcessing);
router.put('/orders/:id/out-for-delivery', factoryOrders.setOutForDelivery);
router.put('/orders/:id/assign-driver', factoryOrders.assignDriver);

// Stock management for factory managers
router.get('/stock', factoryStock.listStock);
router.put('/stock/:id', factoryStock.updateStockItem);

module.exports = router;
