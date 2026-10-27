const express = require('express');
const ActivityLogController = require('../controllers/activity-log.controller');

const router = express.Router();

router.post('/client-errors', ActivityLogController.clientError);
router.get('/reports', ActivityLogController.reports);
router.get('/reports/export', ActivityLogController.export);

module.exports = router;
