const express = require('express');
const router = express.Router();
const moldController = require('../controllers/mold.controller');

router.get('/', moldController.getMolds);
router.post('/', moldController.addMold);
router.put('/:id', moldController.updateMold);
router.post('/:id/shots', moldController.logMoldShots);

module.exports = router;
