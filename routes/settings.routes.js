const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/reset', settingsController.resetDefaults);

module.exports = router;
