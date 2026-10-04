const PublicBlogModel = require('../models/public.model');

const clamp = (value, min, max, fallback) => {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? fallback : Math.min(Math.max(n, min), max);
};

class PublicBlogController {
    async getArticles(req, res) {
        try {
            const limit = clamp(req.query.limit, 1, 50, 10);
            const page = clamp(req.query.page, 1, 10000, 1);
            const offset = req.query.offset !== undefined ? clamp(req.query.offset, 0, 1e6, 0) : (page - 1) * limit;
            const category = typeof req.query.category === 'string' ? req.query.category : null;
            const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim().slice(0, 100) : null;

            const { articles, total } = await PublicBlogModel.getPublicArticles({ limit, offset, category, q });
            res.json({ articles, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getArticle(req, res) {
        try {
            const article = await PublicBlogModel.getArticleBySlug(req.params.slug);
            if (!article) {
                return res.status(404).json({ error: 'Article not found or not yet published' });
            }
            const related = await PublicBlogModel.getRelated(article);
            res.json({ ...article, related });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getCategories(req, res) {
        try {
            const categories = await PublicBlogModel.getCategories();
            res.json(categories.map(c => ({ ...c, article_count: Number(c.article_count) })));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PublicBlogController();
