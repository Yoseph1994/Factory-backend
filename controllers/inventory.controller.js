const inventoryService = require('../services/inventory.service');

async function getInventory(req, res, next) {
  try {
    const result = await inventoryService.getInventory();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function addMaterial(req, res, next) {
  try {
    const material = await inventoryService.addMaterial(req.body);
    res.status(201).json(material);
  } catch (err) {
    next(err);
  }
}

async function updateMaterial(req, res, next) {
  try {
    const updated = await inventoryService.updateMaterial(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function adjustStock(req, res, next) {
  try {
    const { delta, reason } = req.body;
    const performedBy = req.user ? `${req.user.name} (${req.user.role})` : 'Floor Operator';
    const result = await inventoryService.adjustStock(req.params.id, delta, reason, performedBy);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteMaterial(req, res, next) {
  try {
    const result = await inventoryService.deleteMaterial(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInventory,
  addMaterial,
  updateMaterial,
  adjustStock,
  deleteMaterial
};
