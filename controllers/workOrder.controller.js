const workOrderService = require('../services/workOrder.service');

async function getWorkOrders(req, res, next) {
  try {
    const orders = await workOrderService.getWorkOrders();
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

async function addWorkOrder(req, res, next) {
  try {
    const order = await workOrderService.addWorkOrder(req.body);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function updateWorkOrder(req, res, next) {
  try {
    const updated = await workOrderService.updateWorkOrder(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getWorkOrders,
  addWorkOrder,
  updateWorkOrder
};
