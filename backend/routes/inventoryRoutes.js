const express = require('express');
const router = express.Router();
const ic = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Dashboard
router.get('/dashboard', ic.getDashboard);

// Receipts
router.get('/receipts', ic.getReceipts);
router.get('/receipts/:id', ic.getReceipt);
router.post('/receipts', ic.createReceipt);
router.put('/receipts/:id/validate', ic.validateReceipt);
router.put('/receipts/:id/cancel', ic.cancelReceipt);

// Deliveries
router.get('/deliveries', ic.getDeliveries);
router.get('/deliveries/:id', ic.getDelivery);
router.post('/deliveries', ic.createDelivery);
router.put('/deliveries/:id/validate', ic.validateDelivery);
router.put('/deliveries/:id/cancel', ic.cancelDelivery);

// Transfers
router.get('/transfers', ic.getTransfers);
router.get('/transfers/:id', ic.getTransfer);
router.post('/transfers', ic.createTransfer);
router.put('/transfers/:id/validate', ic.validateTransfer);

// Adjustments
router.get('/adjustments', ic.getAdjustments);
router.post('/adjustments', ic.createAdjustment);

// Move History
router.get('/move-history', ic.getMoveHistory);

// Warehouses & Locations
router.get('/warehouses', ic.getWarehouses);
router.post('/warehouses', ic.createWarehouse);
router.put('/warehouses/:id', ic.updateWarehouse);
router.delete('/warehouses/:id', ic.deleteWarehouse);
router.get('/locations', ic.getLocations);
router.post('/locations', ic.createLocation);
router.delete('/locations/:id', ic.deleteLocation);

module.exports = router;
