const express = require('express');
const router = express.Router();
const PublicBlogController = require('../controllers/public.controller');

router.get('/categories', PublicBlogController.getCategories);
router.get('/articles', PublicBlogController.getArticles);
router.get('/articles/:slug', PublicBlogController.getArticle);

// Legacy paths kept for the original /blog mount
router.get('/', PublicBlogController.getArticles);
router.get('/:slug', PublicBlogController.getArticle);

module.exports = router;
