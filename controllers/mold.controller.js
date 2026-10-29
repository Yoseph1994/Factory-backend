const moldService = require('../services/mold.service');

async function getMolds(req, res, next) {
  try {
    const molds = await moldService.getMolds();
    res.json(molds);
  } catch (err) {
    next(err);
  }
}

async function addMold(req, res, next) {
  try {
    const mold = await moldService.addMold(req.body);
    res.status(201).json(mold);
  } catch (err) {
    next(err);
  }
}

async function updateMold(req, res, next) {
  try {
    const updated = await moldService.updateMold(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function logMoldShots(req, res, next) {
  try {
    const result = await moldService.logMoldShots(req.params.id, req.body.shots);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMolds,
  addMold,
  updateMold,
  logMoldShots
};
