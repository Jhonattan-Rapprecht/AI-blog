const express = require('express');
const router = express.Router();
const PublicBlogController = require('../controllers/public.controller');

router.get('/', PublicBlogController.getArticles);
router.get('/:slug', PublicBlogController.getArticle);

module.exports = router;
