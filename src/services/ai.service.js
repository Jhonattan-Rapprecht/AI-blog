const { ProviderFactory } = require('../providers/ai.provider');
const fs = require('fs');
const path = require('path');

class AIService {
    async generateArticle(config) {
        const provider = ProviderFactory.getProvider();

        const systemPrompt = `You are an expert high-performance blog writer.
        Your goal is to create a comprehensive, SEO-optimized article.
        You MUST respond ONLY with a valid JSON object. Do not include markdown formatting like \`\`\`json.

        Expected JSON structure:
        {
            "title": "...",
            "slug": "...",
            "excerpt": "...",
            "content": "...",
            "seo_title": "...",
            "seo_description": "...",
            "seo_keywords": ["key1", "key2"],
            "tags": ["tag1", "tag2"],
            "category": "..."
        }`;

        const userPrompt = `Topic: ${config.topic}
Target Audience: ${config.targetAudience}
Language: ${config.language}
Tone: ${config.tone}
Article Length: ${config.articleLength}
Keywords: ${config.keywords}
Category: ${config.category}
Additional Instructions: ${config.additionalInstructions}`;

        const result = await provider.generate({
            systemPrompt,
            userPrompt,
            responseFormat: 'json'
        });

        try {
            let content = result.content.trim();
            if (content.startsWith('```json')) {
                content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (content.startsWith('```')) {
                content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(content);
            this._validateResponse(parsed);
            return {
                data: parsed,
                meta: { provider: result.provider, model: result.model }
            };
        } catch (e) {
            throw new Error(`AI Response Validation Failed: ${e.message}. Raw response: ${result.content.substring(0, 100)}...`);
        }
    }

    _validateResponse(data) {
        const required = ['title', 'slug', 'excerpt', 'content', 'seo_title', 'seo_description'];
        for (const field of required) {
            if (!data[field]) throw new Error(`Missing required field: ${field}`);
        }
    }
}

module.exports = new AIService();
