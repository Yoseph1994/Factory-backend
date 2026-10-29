const settingsService = require('../services/settings.service');

async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const updated = await settingsService.updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function resetDefaults(req, res, next) {
  try {
    const result = await settingsService.resetDefaults();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  resetDefaults
};
