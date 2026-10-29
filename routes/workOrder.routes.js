const express = require('express');
const router = express.Router();
const workOrderController = require('../controllers/workOrder.controller');

router.get('/', workOrderController.getWorkOrders);
router.post('/', workOrderController.addWorkOrder);
router.put('/:id', workOrderController.updateWorkOrder);

module.exports = router;
