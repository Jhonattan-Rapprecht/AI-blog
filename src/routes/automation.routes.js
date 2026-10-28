const express = require('express');
const router = express.Router();
const AutomationService = require('../services/automation.service');
const { sendUnexpectedError } = require('../utils/http-errors');

router.post('/run', async (req, res) => {
    try {
        const result = await AutomationService.runAutoGeneration(req.body);
        res.json(result);
    } catch (error) { return sendUnexpectedError(res, 'Automation run', error, 'Could not run automation.'); }
});

module.exports = router;
