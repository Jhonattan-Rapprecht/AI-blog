const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settings.controller');

router.get('/', SettingsController.get);
router.put('/', SettingsController.update);
router.post('/check-model', SettingsController.checkModel);

module.exports = router;
