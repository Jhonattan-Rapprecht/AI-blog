const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class AIGenerationModel {
    async create(data) {
        const {
            article_id = null,
            provider = null,
            model = null,
            prompt = null,
            response = null,
            status = null,
            error_message = null
        } = data;

        const id = uuidv4();
        const sql = `
            INSERT INTO ai_generations
            (id, article_id, provider, model, prompt, response, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Ensure response is stringified if it's an object
        const responseValue = typeof response === 'object' ? JSON.stringify(response) : response;

        await db.query(sql, [
            id,
            article_id ?? null,
            provider ?? null,
            model ?? null,
            prompt ?? null,
            responseValue ?? null,
            status ?? null,
            error_message ?? null
        ]);
        return id;
    }

    async findByArticleId(articleId) {
        const sql = 'SELECT * FROM ai_generations WHERE article_id = ? ORDER BY created_at DESC';
        return await db.query(sql, [articleId]);
    }

    async findAll(pagination = { limit: 20, offset: 0 }) {
        const sql = 'SELECT * FROM ai_generations ORDER BY created_at DESC LIMIT ? OFFSET ?';
        return await db.query(sql, [parseInt(pagination.limit), parseInt(pagination.offset)]);
    }
}

module.exports = new AIGenerationModel();
