const express = require('express');
const router = express.Router();
const machineController = require('../controllers/machine.controller');

router.get('/', machineController.getMachines);
router.post('/', machineController.addMachine);
router.put('/:id', machineController.updateMachine);

module.exports = router;
