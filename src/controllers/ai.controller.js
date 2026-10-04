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

            const articleId = await ArticleModel.create({
                ...result.data,
                status: 'review'
            });

            try {
                await AIGenerationModel.create({
                    article_id: articleId,
                    provider: result.meta.provider,
                    model: result.meta.model,
                    prompt: JSON.stringify(config),
                    response: result.data,
                    status: 'completed'
                });
            } catch (historyError) {
                console.error('Non-critical error logging AI history:', historyError);
            }

            io.emit('ai:generation:completed', { articleId });

            return res.json({
                articleId,
                article: result.data
            });
        } catch (error) {
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

            return res.status(500).json({ error: error.message });
        }
    }

    async suggestSlug(req, res) {
        try {
            const { title } = req.body;
            if (!title) return res.status(400).json({ error: 'Title is required' });

            const provider = require('../providers/ai.provider').ProviderFactory.getProvider();

            const systemPrompt = 'You are a URL slug generator. Return ONLY a JSON array of 3 short, SEO-friendly, lowercase, hyphenated slugs based on the title provided. No other text.';
            const userPrompt = `Title: ${title}`;

            const result = await provider.generate({
                systemPrompt,
                userPrompt,
                responseFormat: 'json'
            });

            let content = result.content.trim();
            if (content.startsWith('```json')) {
                content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (content.startsWith('```')) {
                content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            const slugs = JSON.parse(content);
            const slugArray = Array.isArray(slugs) ? slugs : (slugs.slugs || []);

            res.json({ suggestions: slugArray.slice(0, 3) });
        } catch (error) {
            const { title } = req.body;
            const fallback = (title || '').toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            res.json({ suggestions: [fallback, `${fallback}-guide`, `${fallback}-tips`] });
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
