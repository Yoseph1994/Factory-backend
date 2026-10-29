const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');

router.get('/', payrollController.getPayrolls);
router.post('/generate', payrollController.generatePayroll);
router.put('/:id', payrollController.updatePayroll);

module.exports = router;
