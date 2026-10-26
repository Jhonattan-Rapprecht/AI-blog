const AIService = require('../services/ai.service');
const ArticleModel = require('../models/article.model');
const AIGenerationModel = require('../models/ai.generation.model');
const TopicHistoryModel = require('../models/topic.history.model');
const SettingsService = require('../services/settings.service');

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

function extractTopicSuggestions(value) {
    if (typeof value === 'string') {
        const lines = value.split(/\r?\n/).map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim()).filter(Boolean);
        return lines.length > 1 ? lines : (value.trim() ? [value.trim()] : []);
    }
    if (Array.isArray(value)) return value.flatMap(extractTopicSuggestions);
    if (value && typeof value === 'object') {
        for (const key of ['topics', 'suggestions', 'ideas', 'titles']) {
            if (value[key] !== undefined) {
                const preferred = extractTopicSuggestions(value[key]);
                if (preferred.length) return preferred;
            }
        }
        return Object.values(value).flatMap(extractTopicSuggestions);
    }
    return [];
}

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
        try {
            const provider = require('../providers/ai.provider').ProviderFactory.getProvider();
            const category = typeof req.body?.category === 'string' ? req.body.category.trim() : '';
            const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
            const systemPrompt = `You are a creative blog editor. Return ONLY a valid JSON array of exactly ${WANTED} specific, engaging article topic titles as plain strings. You may suggest any subject matter, including artificial intelligence and technology. Do not impose a fixed subject list.`;
            const focus = topic
                ? `The user's topic idea is: "${topic}". Create focused variations and related angles based on this idea; preserve the key subject and do not switch to unrelated topics.`
                : 'No topic idea was entered. Choose varied subjects freely.';
            const userPrompt = `Suggest ${WANTED} distinct, engaging article topics. ${focus}${category ? ` Keep them relevant to the selected category: "${category}".` : ''} Make each idea concrete and interesting to readers.`;
            const suggestions = [];
            // Some models return fewer items than requested. Ask for only the
            // missing count and merge unique results before responding.
            for (let attempt = 0; attempt < WANTED && suggestions.length < WANTED; attempt += 1) {
                const missing = WANTED - suggestions.length;
                const prompt = attempt === 0
                    ? userPrompt
                    : `${userPrompt} Return exactly ${missing} additional topic${missing === 1 ? '' : 's'} not duplicating these: ${JSON.stringify(suggestions)}.`;
                const result = await provider.generate({
                    systemPrompt: systemPrompt.replace(`exactly ${WANTED}`, `exactly ${missing}`),
                    userPrompt: prompt,
                    temperature: 0.9,
                    responseFormat: 'json'
                });

                let content = result.content.trim();
                if (content.startsWith('```json')) {
                    content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                } else if (content.startsWith('```')) {
                    content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
                }

                const parsed = JSON.parse(content);
                for (const suggestion of toTextList(extractTopicSuggestions(parsed), WANTED)) {
                    if (!suggestions.some((existing) => existing.toLocaleLowerCase() === suggestion.toLocaleLowerCase())) {
                        suggestions.push(suggestion);
                        if (suggestions.length === WANTED) break;
                    }
                }
            }
            if (!suggestions.length) {
                return res.status(502).json({ error: 'The AI model returned no topic suggestions. Please try again.' });
            }
            if (suggestions.length < WANTED) {
                return res.status(502).json({ error: `The AI model returned only ${suggestions.length} distinct topic suggestions after retries. Please try again.` });
            }
            await TopicHistoryModel.recordMany(suggestions, 'suggested');
            res.json({ suggestions });
        } catch (error) {
            console.error('[AI Controller] suggestTopic failed:', error.message);
            res.status(502).json({ error: `Topic generation failed with ${SettingsService.read().model}: ${error.message}` });
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
