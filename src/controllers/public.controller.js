const PublicBlogModel = require('../models/public.model');

class PublicBlogController {
    async getArticles(req, res) {
        try {
            const pagination = {
                limit: req.query.limit || 10,
                offset: req.query.offset || 0
            };
            const articles = await PublicBlogModel.getPublicArticles(pagination);
            res.json(articles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getArticle(req, res) {
        try {
            const { slug } = req.params;
            const article = await PublicBlogModel.getArticleBySlug(slug);
            if (!article) {
                return res.status(404).json({ error: 'Article not found or not yet published' });
            }
            res.json(article);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PublicBlogController();
