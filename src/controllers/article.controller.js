const ArticleModel = require('../models/article.model');
const MediaModel = require('../models/media.model');
const { sendUnexpectedError } = require('../utils/http-errors');

class ArticleController {
    async create(req, res) {
        try {
            const data = req.body;
            if (!data.title || !data.slug || !data.content) {
                return res.status(400).json({ error: 'Title, slug and content are required' });
            }
            if (data.featured_media_id) {
                const media = await MediaModel.findById(data.featured_media_id);
                if (!media || media.media_type !== 'image') return res.status(400).json({ error: 'Featured media must be an image.' });
            }
            const id = await ArticleModel.create(data);
            req.activityTargetLabel = String(data.title).slice(0, 500);
            res.status(201).json({ id, message: 'Article created successfully' });
        } catch (error) { return sendUnexpectedError(res, 'Articles create', error, 'Could not create article.'); }
    }

    async getAll(req, res) {
        try {
            const filters = req.query;
            const pagination = {
                limit: req.query.limit || 20,
                offset: req.query.offset || 0,
                sortBy: req.query.sortBy,
                direction: req.query.direction
            };
            const articles = await ArticleModel.findAll(filters, pagination);
            res.json(articles);
        } catch (error) { return sendUnexpectedError(res, 'Articles list', error, 'Could not load articles.'); }
    }

    async getById(req, res) {
        try {
            const article = await ArticleModel.findById(req.params.id);
            if (!article) {
                return res.status(404).json({ error: 'Article not found' });
            }
            res.json(article);
        } catch (error) { return sendUnexpectedError(res, 'Articles get', error, 'Could not load article.'); }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            if (Object.hasOwn(data, 'featured_media_id') && data.featured_media_id) {
                const media = await MediaModel.findById(data.featured_media_id);
                if (!media || media.media_type !== 'image') return res.status(400).json({ error: 'Featured media must be an image.' });
            }
            const existing = await ArticleModel.findById(id);
            await ArticleModel.update(id, data);
            req.activityTargetLabel = typeof data.title === 'string' ? data.title.slice(0, 500) : existing?.title || null;
            res.json({ message: 'Article updated successfully' });
        } catch (error) { return sendUnexpectedError(res, 'Articles update', error, 'Could not update article.'); }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const article = await ArticleModel.findById(id);
            await ArticleModel.delete(id);
            req.activityTargetLabel = article?.title || null;
            res.json({ message: 'Article deleted successfully' });
        } catch (error) { return sendUnexpectedError(res, 'Articles delete', error, 'Could not delete article.'); }
    }
}

module.exports = new ArticleController();
