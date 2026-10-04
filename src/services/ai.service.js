const { ProviderFactory } = require('../providers/ai.provider');
const { formatArticleContent } = require('../utils/articleFormatter');
const fs = require('fs');
const path = require('path');

class AIService {
    async generateArticle(config) {
        const provider = ProviderFactory.getProvider();

        const systemPrompt = `You are a world-class SEO blog writer.
Your goal is to produce a comprehensive, high-quality article.
MUST return ONLY a valid JSON object. No markdown, no preamble.

Required JSON structure:
{
    "title": "Engaging title",
    "slug": "url-friendly-slug",
    "excerpt": "Short summary",
    "content": "FULL detailed article as clean HTML. Open with a short introductory <p>, then use <h2> for sections (and <h3> for subsections), each followed by one or more <p> paragraphs. Use <ul>/<ol> with <li> for lists and finish with a conclusion section. Do NOT use <h1> and do NOT repeat the title inside the content. Every piece of text must be inside a tag. Keep paragraphs to 2-4 sentences.",
    "seo_title": "SEO optimized title",
    "seo_description": "SEO description",
    "seo_keywords": ["key1", "key2"],
    "tags": ["tag1", "tag2"],
    "category": "Category Name"
}`;

        const userPrompt = `Write a full-length, professional article.
Topic: ${config.topic}
Target Audience: ${config.targetAudience}
Language: ${config.language}
Tone: ${config.tone}
Keywords: ${config.keywords}
Category: ${config.category}
Details: ${config.additionalInstructions}`;

        console.log(`[AI Service] Requesting generation for topic: ${config.topic}`);

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
            parsed.content = formatArticleContent(parsed.content, parsed.title);
            return {
                data: parsed,
                meta: { provider: result.provider, model: result.model }
            };
        } catch (e) {
            console.error('[AI Service] JSON Parsing Error. Raw content:', result.content);
            throw new Error(`AI Response Validation Failed: ${e.message}`);
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
