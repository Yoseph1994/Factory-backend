const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');

router.get('/', maintenanceController.getMaintenanceTickets);
router.post('/', maintenanceController.addMaintenanceTicket);
router.put('/:id', maintenanceController.updateMaintenanceTicket);

module.exports = router;
