const express = require('express');
const router = express.Router();
const qcController = require('../controllers/qc.controller');

router.get('/', qcController.getQCLogs);
router.post('/', qcController.logQC);

module.exports = router;
