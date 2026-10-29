const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

router.get('/', inventoryController.getInventory);
router.post('/', inventoryController.addMaterial);
router.put('/:id', inventoryController.updateMaterial);
router.post('/:id/adjust', inventoryController.adjustStock);
router.delete('/:id', inventoryController.deleteMaterial);

module.exports = router;
