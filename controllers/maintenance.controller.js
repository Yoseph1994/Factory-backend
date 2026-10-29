const maintenanceService = require('../services/maintenance.service');

async function getMaintenanceTickets(req, res, next) {
  try {
    const tickets = await maintenanceService.getMaintenanceTickets();
    res.json(tickets);
  } catch (err) {
    next(err);
  }
}

async function addMaintenanceTicket(req, res, next) {
  try {
    const ticket = await maintenanceService.addMaintenanceTicket(req.body);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}

async function updateMaintenanceTicket(req, res, next) {
  try {
    const updated = await maintenanceService.updateMaintenanceTicket(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMaintenanceTickets,
  addMaintenanceTicket,
  updateMaintenanceTicket
};
