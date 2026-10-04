const express = require('express');
const router = express.Router();
const AutomationService = require('../services/automation.service');

router.post('/run', async (req, res) => {
    try {
        const result = await AutomationService.runAutoGeneration(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
