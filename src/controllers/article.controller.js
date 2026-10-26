const ArticleModel = require('../models/article.model');
const MediaModel = require('../models/media.model');

class ArticleController {
    async create(req, res) {
        try {
            const data = req.body;
            if (!data.title || !data.slug || !data.content) {
                return res.status(400).json({ error: 'Title, slug and content are required' });
            }
            if (data.featured_media_id && !await MediaModel.findById(data.featured_media_id)) return res.status(400).json({ error: 'Selected media item was not found.' });
            const id = await ArticleModel.create(data);
            res.status(201).json({ id, message: 'Article created successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getAll(req, res) {
        try {
            const filters = req.query;
            const pagination = {
                limit: req.query.limit || 20,
                offset: req.query.offset || 0
            };
            const articles = await ArticleModel.findAll(filters, pagination);
            res.json(articles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getById(req, res) {
        try {
            const article = await ArticleModel.findById(req.params.id);
            if (!article) {
                return res.status(404).json({ error: 'Article not found' });
            }
            res.json(article);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            if (Object.hasOwn(data, 'featured_media_id') && data.featured_media_id && !await MediaModel.findById(data.featured_media_id)) return res.status(400).json({ error: 'Selected media item was not found.' });
            await ArticleModel.update(id, data);
            res.json({ message: 'Article updated successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await ArticleModel.delete(id);
            res.json({ message: 'Article deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ArticleController();
