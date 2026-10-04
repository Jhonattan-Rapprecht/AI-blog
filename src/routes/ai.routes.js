const express = require('express');
const router = express.Router();
const AIController = require('../controllers/ai.controller');

router.post('/generate-article', AIController.generateArticle);
router.get('/status', AIController.getStatus);
router.get('/history/:articleId', AIController.getHistory);
router.post('/suggest-slug', AIController.suggestSlug);
router.post('/suggest-topic', AIController.suggestTopic);

module.exports = router;
