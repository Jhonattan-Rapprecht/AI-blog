const db = require('../config/db');
const ArticleModel = require('../models/article.model');

class PublishingService {
    async publish(id) {
        const now = new Date();
        await ArticleModel.update(id, {
            status: 'published',
            published_at: now
        });

        return { id, published_at: now };
    }

    async schedule(id, scheduled_at) {
        await ArticleModel.update(id, {
            status: 'scheduled',
            scheduled_at: scheduled_at
        });

        return { id, scheduled_at };
    }
}

module.exports = new PublishingService();
