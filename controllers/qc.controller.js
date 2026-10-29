const qcService = require('../services/qc.service');

async function getQCLogs(req, res, next) {
  try {
    const logs = await qcService.getQCLogs();
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

async function logQC(req, res, next) {
  try {
    const record = await qcService.logQCInspection(req.body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQCLogs,
  logQC
};
