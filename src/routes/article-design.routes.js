const express = require('express');
const router = express.Router();
const ArticleDesignController = require('../controllers/article-design.controller');

router.get('/catalog', ArticleDesignController.getCatalog);
router.get('/publication', ArticleDesignController.getPublication);
router.put('/publication', ArticleDesignController.updatePublication);
router.get('/publication-style', ArticleDesignController.getPublicationStyle);
router.put('/publication-style', ArticleDesignController.updatePublicationStyle);
router.get('/articles/:id', ArticleDesignController.getArticleOverride);
router.put('/articles/:id', ArticleDesignController.updateArticleOverride);
router.delete('/articles/:id', ArticleDesignController.clearArticleOverride);
router.get('/articles/:id/style', ArticleDesignController.getArticleStyle);
router.put('/articles/:id/style', ArticleDesignController.updateArticleStyle);
router.delete('/articles/:id/style', ArticleDesignController.clearArticleStyle);

module.exports = router;
