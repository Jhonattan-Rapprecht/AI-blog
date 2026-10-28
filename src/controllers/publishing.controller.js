const PublishingService = require('../services/publishing.service');
const ArticleModel = require('../models/article.model');
const { sendUnexpectedError } = require('../utils/http-errors');

class PublishingController {
    async publish(req, res) {
        try {
            const { id } = req.params;
            const { io } = req;
            const article = await ArticleModel.findById(id);
            const result = await PublishingService.publish(id);
            req.activityTargetLabel = article?.title || null;

            io.emit('article:published', { id, published_at: result.published_at });

            res.json({ message: 'Article published successfully', ...result });
        } catch (error) { return sendUnexpectedError(res, 'Publishing publish', error, 'Could not publish article.'); }
    }

    async schedule(req, res) {
        try {
            const { id } = req.params;
            const { scheduled_at } = req.body;

            if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at is required' });

            const article = await ArticleModel.findById(id);
            const result = await PublishingService.schedule(id, scheduled_at);
            req.activityTargetLabel = article?.title || null;
            res.json({ message: 'Article scheduled successfully', ...result });
        } catch (error) { return sendUnexpectedError(res, 'Publishing schedule', error, 'Could not schedule article.'); }
    }
}

module.exports = new PublishingController();
