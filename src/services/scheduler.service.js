const db = require('../config/db');
const ArticleModel = require('../models/article.model');
const PublishingService = require('./publishing.service');
const ActivityLog = require('../models/activity-log.model');

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
                SELECT id, title FROM articles
                WHERE status = 'scheduled'
                AND scheduled_at <= CURRENT_TIMESTAMP
            `;
            const dueArticles = await db.query(sql);

            if (dueArticles.length === 0) return;

            console.log(`Scheduler found ${dueArticles.length} articles to publish.`);

            for (const article of dueArticles) {
                try {
                    await PublishingService.publish(article.id);
                    console.log(`Successfully published article: ${article.id}`);
                    void ActivityLog.record({ category: 'publishing', eventType: 'article.auto_published', severity: 'info', outcome: 'success', actorType: 'system', source: 'scheduler', action: 'Scheduled article published automatically', targetType: 'article', targetId: article.id, targetLabel: article.title });
                } catch (error) {
                    console.error(`Scheduler could not publish article ${article.id}:`, error.message);
                    void ActivityLog.record({ category: 'errors', eventType: 'article.auto_publish_failed', severity: 'error', outcome: 'failure', actorType: 'system', source: 'scheduler', action: 'Scheduled article could not be published', targetType: 'article', targetId: article.id, targetLabel: article.title, details: { errorName: error.name, errorCode: error.code || null } });
                }
            }
        } catch (error) {
            console.error('Scheduler Error:', error);
            void ActivityLog.record({ category: 'errors', eventType: 'scheduler.run_failed', severity: 'error', outcome: 'failure', actorType: 'system', source: 'scheduler', action: 'Scheduled publishing check failed', details: { errorName: error.name, errorCode: error.code || null } });
        }
    }
}

module.exports = new SchedulerService();
