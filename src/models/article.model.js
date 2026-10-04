const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class ArticleModel {
    async create(data) {
        const {
            title, slug, excerpt, content, featured_image,
            status, category_id, author_id, seo_title,
            seo_description, seo_keywords, published_at, scheduled_at
        } = data;

        const id = uuidv4();
        const sql = `
            INSERT INTO articles
            (id, title, slug, excerpt, content, featured_image, status, category_id, author_id, seo_title, seo_description, seo_keywords, published_at, scheduled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(sql, [
            id, title, slug, excerpt, content, featured_image,
            status || 'draft', category_id, author_id, seo_title,
            seo_description, seo_keywords, published_at, scheduled_at
        ]);

        return id;
    }

    async findAll(filters = {}, pagination = { limit: 20, offset: 0 }) {
        let sql = 'SELECT * FROM articles';
        const params = [];
        const whereClauses = [];

        if (filters.status) {
            whereClauses.push('status = ?');
            params.push(filters.status);
        }
        if (filters.category_id) {
            whereClauses.push('category_id = ?');
            params.push(filters.category_id);
        }

        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(pagination.limit), parseInt(pagination.offset));

        return await db.query(sql, params);
    }

    async findById(id) {
        const sql = 'SELECT * FROM articles WHERE id = ?';
        const results = await db.query(sql, [id]);
        return results[0];
    }

    async update(id, data) {
        const fields = [];
        const params = [];

        for (const [key, value] of Object.entries(data)) {
            fields.push(`${key} = ?`);
            params.push(value);
        }

        if (fields.length === 0) return null;

        params.push(id);
        const sql = `UPDATE articles SET ${fields.join(', ')} WHERE id = ?`;
        await db.query(sql, params);
        return true;
    }

    async delete(id) {
        const sql = 'DELETE FROM articles WHERE id = ?';
        await db.query(sql, [id]);
        return true;
    }
}

module.exports = new ArticleModel();
