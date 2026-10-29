const payrollService = require('../services/payroll.service');

async function getPayrolls(req, res, next) {
  try {
    const payrolls = await payrollService.getPayrolls();
    res.json(payrolls);
  } catch (err) {
    next(err);
  }
}

async function generatePayroll(req, res, next) {
  try {
    const result = await payrollService.generateMonthlyPayroll(req.body.month);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function updatePayroll(req, res, next) {
  try {
    const updated = await payrollService.updatePayroll(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPayrolls,
  generatePayroll,
  updatePayroll
};
