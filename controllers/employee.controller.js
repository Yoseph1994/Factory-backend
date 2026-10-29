const employeeService = require('../services/employee.service');

async function getEmployees(req, res, next) {
  try {
    const employees = await employeeService.getEmployees();
    res.json(employees);
  } catch (err) {
    next(err);
  }
}

async function addEmployee(req, res, next) {
  try {
    const employee = await employeeService.addEmployee(req.body);
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const updated = await employeeService.updateEmployee(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteEmployee(req, res, next) {
  try {
    const result = await employeeService.deleteEmployee(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee
};
