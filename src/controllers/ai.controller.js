const AIService = require('../services/ai.service');
const ArticleModel = require('../models/article.model');
const AIGenerationModel = require('../models/ai.generation.model');
const TopicHistoryModel = require('../models/topic.history.model');
const SettingsService = require('../services/settings.service');

const TOPIC_DOMAINS = [
    'food, cooking, and culinary traditions',
    'travel, local culture, and outdoor adventures',
    'personal finance, saving, and consumer choices',
    'health, fitness, sleep, and everyday wellbeing',
    'history, archaeology, and overlooked historical events',
    'nature, wildlife, oceans, and environmental change',
    'home improvement, gardening, and practical DIY',
    'relationships, family life, and community',
    'science discoveries and surprising natural phenomena',
    'education, learning, and career development',
    'sports, athletes, and the culture around competition',
    'books, film, music, art, and popular culture',
    'small business, entrepreneurship, and local economies',
    'architecture, design, and the places people live',
    'everyday technology and useful consumer products'
];
const AI_TOPIC_PATTERN = /\b(ai|artificial intelligence|machine learning|large language models?|llms|chatgpt|generative ai|neural networks?|chatbots?)\b/i;

function chooseTopicDomains(count) {
    const pool = [...TOPIC_DOMAINS];
    const chosen = [];
    while (chosen.length < count && pool.length) {
        chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return chosen;
}

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
                    model: SettingsService.read().model,
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

            for (let attempt = 0; attempt < MAX_ATTEMPTS && fresh.length < WANTED; attempt++) {
                const avoid = [...fresh, ...used].slice(0, PROMPT_HISTORY);
                const domains = chooseTopicDomains(WANTED - fresh.length);
                const systemPrompt = `You are an editor for a broad-interest magazine. Return ONLY a valid JSON array of exactly ${domains.length} specific, engaging article topic titles as plain strings. Give one distinct topic for each subject area provided. Topics must be about real-world subjects and must NOT be about AI, artificial intelligence, machine learning, language models, or chatbots.`;
                const userPrompt = `Generate fresh article ideas across these subject areas, one idea per area:\n${domains.map((domain, index) => `${index + 1}. ${domain}`).join('\n')}\nMake each topic concrete, useful or surprising, and clearly different from the others. Do not use generic "AI-powered" titles.` +
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
                    if (AI_TOPIC_PATTERN.test(topic)) continue;
                    if (!TopicHistoryModel.isDuplicate(topic, [...used, ...fresh])) fresh.push(topic);
                }
            }

            if (fresh.length === 0) return res.status(502).json({ error: 'Could not generate fresh non-AI topics. Please try again.' });
            await TopicHistoryModel.recordMany(fresh, 'suggested');
            res.json({ suggestions: fresh });
        } catch (error) {
            console.error('[AI Controller] suggestTopic failed:', error.message);
            res.status(502).json({ error: 'Could not generate topic suggestions' });
        }
    }

    async getStatus(req, res) {
        const settings = SettingsService.read();
        const { connected } = await SettingsService.ollamaStatus(settings.ollamaBaseUrl);
        res.json({
            available: connected,
            provider: 'ollama',
            model: settings.model,
            status: connected ? 'connected' : 'disconnected'
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
