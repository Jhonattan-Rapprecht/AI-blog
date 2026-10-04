const express = require('express');
const router = express.Router();
const AIController = require('../controllers/ai.controller');

router.post('/generate-article', AIController.generateArticle);
router.get('/status', AIController.getStatus);
router.get('/history/:articleId', AIController.getHistory);

module.exports = router;
