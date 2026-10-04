const express = require('express');
const router = express.Router();
const PublishingController = require('../controllers/publishing.controller');

router.post('/:id/publish', PublishingController.publish);
router.post('/:id/schedule', PublishingController.schedule);

module.exports = router;
