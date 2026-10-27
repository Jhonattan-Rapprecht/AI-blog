const express = require('express');
const router = express.Router();
const AIController = require('../controllers/ai.controller');

router.post('/generate-article', AIController.generateArticle);
router.get('/status', AIController.getStatus);
router.get('/history/:articleId', AIController.getHistory);
router.post('/suggest-slug', AIController.suggestSlug);
router.post('/suggest-title', AIController.suggestTitle);
router.post('/suggest-topic', AIController.suggestTopic);
router.post('/review-article', AIController.reviewArticle.bind(AIController));
router.post('/fact-check-article', AIController.factCheckArticle.bind(AIController));
router.post('/grammar-check-article', AIController.grammarCheckArticle.bind(AIController));
router.post('/fact-check-selection', AIController.factCheckArticle.bind(AIController));
router.post('/grammar-check-selection', AIController.grammarCheckArticle.bind(AIController));
router.post('/check-excerpt', AIController.checkExcerpt.bind(AIController));
router.post('/check-title', AIController.checkTitle.bind(AIController));
router.post('/spellcheck-article', AIController.spellcheckArticle.bind(AIController));
router.post('/review-history/:articleId', AIController.saveArticleReviewHistory);
router.get('/review-history/:articleId', AIController.getArticleReviewHistory);
router.patch('/review-findings/:findingId', AIController.updateArticleReviewFinding);

module.exports = router;
