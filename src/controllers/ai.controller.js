const AIService = require('../services/ai.service');
const ArticleModel = require('../models/article.model');
const AIGenerationModel = require('../models/ai.generation.model');
const TopicHistoryModel = require('../models/topic.history.model');

const toText = (item) => {
    if (typeof item === 'string') return item.trim();
    if (item && typeof item === 'object') {
        const value = item.title ?? item.topic ?? item.name ?? item.slug ?? Object.values(item).find(v => typeof v === 'string');
        return typeof value === 'string' ? value.trim() : '';
    }
    return '';
};

const toTextList = (items, limit = 3) =>
    (Array.isArray(items) ? items : []).map(toText).filter(Boolean).slice(0, limit);

class AIController {
    async generateArticle(req, res) {
        try {
            const config = req.body;
            const { io } = req;

            io.emit('ai:generation:started', { topic: config.topic });
            TopicHistoryModel.record(config.topic, 'generated').catch((e) => console.error('[Topic History]', e.message));

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

            res.json({ suggestions: toTextList(slugArray) });
        } catch (error) {
            const { title } = req.body;
            const fallback = (title || '').toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            res.json({ suggestions: [fallback, `${fallback}-guide`, `${fallback}-tips`] });
        }
    }

    async suggestTopic(req, res) {
        const WANTED = 3;
        const MAX_ATTEMPTS = 4;
        const PROMPT_HISTORY = 40;
        try {
            const provider = require('../providers/ai.provider').ProviderFactory.getProvider();
            const used = await TopicHistoryModel.findAllUsed();
            const fresh = [];
            const angles = ['practical how-to guides', 'industry trends', 'beginner-friendly explainers', 'case studies', 'opinion and analysis', 'tools and productivity'];

            for (let attempt = 0; attempt < MAX_ATTEMPTS && fresh.length < WANTED; attempt++) {
                const avoid = [...fresh, ...used].slice(0, PROMPT_HISTORY);
                const systemPrompt = `You are a creative content strategist. Return ONLY a JSON array of ${WANTED} high-performing, trending, and engaging article topics, each a plain string. No other text.`;
                const userPrompt = `Suggest ${WANTED} trending topics for a high-performance AI-powered blog. Focus on ${angles[(attempt + used.length) % angles.length]}.` +
                    (avoid.length
                        ? `\nDo NOT repeat or closely paraphrase any of these previously used topics:\n${avoid.map((t) => `- ${t}`).join('\n')}`
                        : '');

                let result;
                try {
                    result = await provider.generate({
                        systemPrompt,
                        userPrompt,
                        temperature: Math.min(0.7 + attempt * 0.15, 1.1),
                        responseFormat: 'json'
                    });
                } catch (err) {
                    if (attempt === MAX_ATTEMPTS - 1) throw err;
                    continue;
                }

                let content = result.content.trim();
                if (content.startsWith('```json')) {
                    content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                } else if (content.startsWith('```')) {
                    content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
                }

                let candidates = [];
                try {
                    const topics = JSON.parse(content);
                    candidates = toTextList(Array.isArray(topics) ? topics : (topics.topics || topics.suggestions || []), 10);
                } catch {
                    continue;
                }

                for (const topic of candidates) {
                    if (fresh.length >= WANTED) break;
                    if (!TopicHistoryModel.isDuplicate(topic, [...used, ...fresh])) fresh.push(topic);
                }
            }

            await TopicHistoryModel.recordMany(fresh, 'suggested');
            res.json({ suggestions: fresh });
        } catch (error) {
            console.error('[AI Controller] suggestTopic failed:', error.message);
            res.status(502).json({ error: 'Could not generate topic suggestions' });
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
