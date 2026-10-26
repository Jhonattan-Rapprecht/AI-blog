const express = require('express');
const router = express.Router();
const AIController = require('../controllers/ai.controller');

router.post('/generate-article', AIController.generateArticle);
router.get('/status', AIController.getStatus);
router.get('/history/:articleId', AIController.getHistory);
router.post('/suggest-slug', AIController.suggestSlug);
router.post('/suggest-topic', AIController.suggestTopic);
router.post('/review-article', AIController.reviewArticle);
router.post('/spellcheck-article', AIController.spellcheckArticle);
router.post('/review-history/:articleId', AIController.saveArticleReviewHistory);
router.get('/review-history/:articleId', AIController.getArticleReviewHistory);
router.patch('/review-findings/:findingId', AIController.updateArticleReviewFinding);

module.exports = router;
