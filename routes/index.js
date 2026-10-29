const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const dashboardRoutes = require('./dashboard.routes');
const inventoryRoutes = require('./inventory.routes');
const productRoutes = require('./product.routes');
const machineRoutes = require('./machine.routes');
const moldRoutes = require('./mold.routes');
const qcRoutes = require('./qc.routes');
const workOrderRoutes = require('./workOrder.routes');
const maintenanceRoutes = require('./maintenance.routes');
const employeeRoutes = require('./employee.routes');
const payrollRoutes = require('./payroll.routes');
const settingsRoutes = require('./settings.routes');

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/products', productRoutes);
router.use('/machines', machineRoutes);
router.use('/molds', moldRoutes);
router.use('/qc', qcRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/employees', employeeRoutes);
router.use('/payroll', payrollRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
