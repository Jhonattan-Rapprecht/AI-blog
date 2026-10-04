const db = require('../config/db');
const ArticleModel = require('../models/article.model');
const PublishingService = require('./publishing.service');

class SchedulerService {
    constructor() {
        this.timer = null;
        this.interval = 60 * 1000; // Check every minute
    }

    start() {
        if (this.timer) return;
        console.log('Scheduler started: Checking for articles to publish every minute...');
        this.timer = setInterval(() => this.checkAndPublish(), this.interval);
    }

    stop() {
        clearInterval(this.timer);
        this.timer = null;
    }

    async checkAndPublish() {
        try {
            // Efficiently find articles that are 'scheduled' and due
            const sql = `
                SELECT id FROM articles
                WHERE status = 'scheduled'
                AND scheduled_at <= CURRENT_TIMESTAMP
            `;
            const dueArticles = await db.query(sql);

            if (dueArticles.length === 0) return;

            console.log(`Scheduler found ${dueArticles.length} articles to publish.`);

            for (const article of dueArticles) {
                await PublishingService.publish(article.id);
                console.log(`Successfully published article: ${article.id}`);
            }
        } catch (error) {
            console.error('Scheduler Error:', error);
        }
    }
}

module.exports = new SchedulerService();
