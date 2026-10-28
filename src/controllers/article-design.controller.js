const { getArticleDesignCatalog, normalizeLayoutSelection, normalizeStyleSelection } = require('../config/article-design.config');
const ArticleDesignModel = require('../models/article-design.model');

class ArticleDesignController {
    async getCatalog(req, res) {
        try {
            res.json(getArticleDesignCatalog());
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getPublication(req, res) {
        try {
            res.json(await ArticleDesignModel.getPublicationSelection());
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updatePublication(req, res) {
        const selection = normalizeLayoutSelection(req.body);
        if (!selection) return res.status(400).json({ error: 'Choose an approved article layout.' });
        try {
            res.json(await ArticleDesignModel.setPublicationSelection(selection));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getArticleOverride(req, res) {
        try {
            res.json(await ArticleDesignModel.getArticleSelection(req.params.id));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateArticleOverride(req, res) {
        const selection = normalizeLayoutSelection(req.body);
        if (!selection) return res.status(400).json({ error: 'Choose an approved article layout.' });
        try {
            res.json(await ArticleDesignModel.setArticleSelection(req.params.id, selection));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async clearArticleOverride(req, res) {
        try {
            await ArticleDesignModel.clearArticleSelection(req.params.id);
            res.status(204).end();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getPublicationStyle(req, res) { try { res.json(await ArticleDesignModel.getPublicationStyle()); } catch { res.status(500).json({ error: 'Could not load publication style.' }); } }
    async updatePublicationStyle(req, res) {
        const { value, errors } = normalizeStyleSelection(req.body);
        if (errors.length) return res.status(400).json({ error: errors[0] });
        try { res.json(await ArticleDesignModel.setPublicationStyle(value)); } catch { res.status(500).json({ error: 'Could not save publication style.' }); }
    }
    async getArticleStyle(req, res) { try { res.json(await ArticleDesignModel.getArticleStyle(req.params.id)); } catch { res.status(500).json({ error: 'Could not load article style.' }); } }
    async updateArticleStyle(req, res) {
        const { value, errors } = normalizeStyleSelection(req.body);
        if (errors.length) return res.status(400).json({ error: errors[0] });
        try { res.json(await ArticleDesignModel.setArticleStyle(req.params.id, value)); } catch { res.status(500).json({ error: 'Could not save article style.' }); }
    }
    async clearArticleStyle(req, res) { try { await ArticleDesignModel.clearArticleStyle(req.params.id); res.status(204).end(); } catch { res.status(500).json({ error: 'Could not clear article style.' }); } }
}

module.exports = new ArticleDesignController();
