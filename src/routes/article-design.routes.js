const express = require('express');
const router = express.Router();
const ArticleDesignController = require('../controllers/article-design.controller');

router.get('/catalog', ArticleDesignController.getCatalog);
router.get('/publication', ArticleDesignController.getPublication);
router.put('/publication', ArticleDesignController.updatePublication);
router.get('/articles/:id', ArticleDesignController.getArticleOverride);
router.put('/articles/:id', ArticleDesignController.updateArticleOverride);
router.delete('/articles/:id', ArticleDesignController.clearArticleOverride);

module.exports = router;
