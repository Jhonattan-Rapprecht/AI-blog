const AIService = require('../services/ai.service');
const ArticleModel = require('../models/article.model');
const AIGenerationModel = require('../models/ai.generation.model');

class AIController {
    async generateArticle(req, res) {
        try {
            const config = req.body;
            const { io } = req;

            io.emit('ai:generation:started', { topic: config.topic });

            const result = await AIService.generateArticle(config);

            // 1. Create the article in review status
            const articleId = await ArticleModel.create({
                ...result.data,
                status: 'review'
            });

            // 2. Persist the generation details for history/debugging
            await AIGenerationModel.create({
                article_id: articleId,
                provider: result.meta.provider,
                model: result.meta.model,
                prompt: JSON.stringify(config),
                response: result.data,
                status: 'completed'
            });

            io.emit('ai:generation:completed', { articleId });

            res.json({
                articleId,
                article: result.data
            });
        } catch (error) {
            // Log failure in history
            try {
                await AIGenerationModel.create({
                    provider: process.env.AI_PROVIDER,
                    model: process.env.OLLAMA_MODEL,
                    prompt: JSON.stringify(req.body),
                    response: { error: error.message },
                    status: 'failed',
                    error_message: error.message
                });
            } catch (logError) {
                console.error('Failed to log AI error:', logError);
            }

            res.status(500).json({ error: error.message });
        }
    }

    async getStatus(req, res) {
        res.json({
            available: true,
            provider: process.env.AI_PROVIDER,
            model: process.env.OLLAMA_MODEL,
            status: 'connected'
        });
    }

    async getHistory(req, res) {
        try {
            const { articleId } = req.params;
            const history = await AIGenerationModel.findByArticleId(articleId);
            res.json(history);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AIController();
