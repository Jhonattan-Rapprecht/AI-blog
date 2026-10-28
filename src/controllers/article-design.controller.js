const { getArticleDesignCatalog, normalizeLayoutSelection, normalizeStyleSelection } = require('../config/article-design.config');
const ArticleDesignModel = require('../models/article-design.model');
const { sendUnexpectedError } = require('../utils/http-errors');

class ArticleDesignController {
    async getCatalog(req, res) {
        try {
            res.json(getArticleDesignCatalog());
        } catch (error) { return sendUnexpectedError(res, 'Article design catalog', error, 'Could not load article design catalog.'); }
    }

    async getPublication(req, res) {
        try {
            res.json(await ArticleDesignModel.getPublicationSelection());
        } catch (error) { return sendUnexpectedError(res, 'Article design publication get', error, 'Could not load publication layout.'); }
    }

    async updatePublication(req, res) {
        const selection = normalizeLayoutSelection(req.body);
        if (!selection) return res.status(400).json({ error: 'Choose an approved article layout.' });
        try {
            res.json(await ArticleDesignModel.setPublicationSelection(selection));
        } catch (error) { return sendUnexpectedError(res, 'Article design publication update', error, 'Could not save publication layout.'); }
    }

    async getArticleOverride(req, res) {
        try {
            res.json(await ArticleDesignModel.getArticleSelection(req.params.id));
        } catch (error) { return sendUnexpectedError(res, 'Article design override get', error, 'Could not load article layout.'); }
    }

    async updateArticleOverride(req, res) {
        const selection = normalizeLayoutSelection(req.body);
        if (!selection) return res.status(400).json({ error: 'Choose an approved article layout.' });
        try {
            res.json(await ArticleDesignModel.setArticleSelection(req.params.id, selection));
        } catch (error) { return sendUnexpectedError(res, 'Article design override update', error, 'Could not save article layout.'); }
    }

    async clearArticleOverride(req, res) {
        try {
            await ArticleDesignModel.clearArticleSelection(req.params.id);
            res.status(204).end();
        } catch (error) { return sendUnexpectedError(res, 'Article design override clear', error, 'Could not clear article layout.'); }
    }

    async getPublicationStyle(req, res) { try { res.json(await ArticleDesignModel.getPublicationStyle()); } catch (error) { return sendUnexpectedError(res, 'Article style publication get', error, 'Could not load publication style.'); } }
    async updatePublicationStyle(req, res) {
        const { value, errors } = normalizeStyleSelection(req.body);
        if (errors.length) return res.status(400).json({ error: errors[0] });
        try { res.json(await ArticleDesignModel.setPublicationStyle(value)); } catch (error) { return sendUnexpectedError(res, 'Article style publication update', error, 'Could not save publication style.'); }
    }
    async getArticleStyle(req, res) { try { res.json(await ArticleDesignModel.getArticleStyle(req.params.id)); } catch (error) { return sendUnexpectedError(res, 'Article style override get', error, 'Could not load article style.'); } }
    async updateArticleStyle(req, res) {
        const { value, errors } = normalizeStyleSelection(req.body);
        if (errors.length) return res.status(400).json({ error: errors[0] });
        try { res.json(await ArticleDesignModel.setArticleStyle(req.params.id, value)); } catch (error) { return sendUnexpectedError(res, 'Article style override update', error, 'Could not save article style.'); }
    }
    async clearArticleStyle(req, res) { try { await ArticleDesignModel.clearArticleStyle(req.params.id); res.status(204).end(); } catch (error) { return sendUnexpectedError(res, 'Article style override clear', error, 'Could not clear article style.'); } }
}

module.exports = new ArticleDesignController();
