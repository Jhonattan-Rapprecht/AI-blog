const db = require('../config/db');
const AIService = require('./ai.service');
const ArticleModel = require('../models/article.model');
const PublishingService = require('./publishing.service');

class AutomationService {
    async runAutoGeneration(config) {
        console.log(`Starting automatic generation for topic: ${config.topic}`);
        try {
            // 1. Generate via AI
            const result = await AIService.generateArticle(config);

            // 2. Create article
            const articleId = await ArticleModel.create({
                ...result.data,
                status: config.auto_publish ? 'published' : 'draft'
            });

            // 3. If auto-publish is disabled, maybe schedule it
            if (!config.auto_publish && config.publication_time) {
                await PublishingService.schedule(articleId, config.publication_time);
            }

            return { articleId, success: true };
        } catch (error) {
            console.error('Automation Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AutomationService();
