const machineService = require('../services/machine.service');

async function getMachines(req, res, next) {
  try {
    const machines = await machineService.getMachines();
    res.json(machines);
  } catch (err) {
    next(err);
  }
}

async function addMachine(req, res, next) {
  try {
    const machine = await machineService.addMachine(req.body);
    res.status(201).json(machine);
  } catch (err) {
    next(err);
  }
}

async function updateMachine(req, res, next) {
  try {
    const updated = await machineService.updateMachine(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMachines,
  addMachine,
  updateMachine
};
