const express = require('express');
const router = express.Router();
const ArticleDesignController = require('../controllers/article-design.controller');

router.get('/catalog', ArticleDesignController.getCatalog);

module.exports = router;
