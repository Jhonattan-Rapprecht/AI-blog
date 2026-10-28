const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { sanitizeArticleHtml } = require('../utils/htmlSanitizer');

class ArticleModel {
    async getOrCreateTopicId(value) {
        const name = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 500);
        if (!name) throw new Error('An article topic is required.');
        const normalizedHash = crypto.createHash('sha256').update(name.toLowerCase()).digest('hex');
        await db.query('INSERT IGNORE INTO topics (id, name, normalized_hash) VALUES (?, ?, ?)', [uuidv4(), name, normalizedHash]);
        const rows = await db.query('SELECT id FROM topics WHERE normalized_hash = ? LIMIT 1', [normalizedHash]);
        if (!rows[0]) throw new Error('Could not save the article topic.');
        return rows[0].id;
    }

    async create(data) {
        const { title = null, slug = null, excerpt = null, content = null, featured_image = null, featured_media_id = null, status = 'draft', category_id = null, author_id = null, seo_title = null, seo_description = null, seo_keywords = null, published_at = null, scheduled_at = null } = data;
        const id = uuidv4();
        await db.query(`INSERT INTO articles (id, title, slug, excerpt, content, featured_image, featured_media_id, status, category_id, topic_id, author_id, seo_title, seo_description, seo_keywords, published_at, scheduled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, title, slug, excerpt, typeof content === 'string' ? sanitizeArticleHtml(content) : content, featured_image, featured_media_id, status, category_id, null, author_id, seo_title, seo_description, seo_keywords, published_at ?? (status === 'published' ? new Date() : null), scheduled_at]);
        return id;
    }

    async findAll(filters = {}, pagination = { limit: 20, offset: 0 }) {
        let sql = 'SELECT a.*, c.name AS category_name, m.filepath AS featured_media_path, m.credit AS featured_image_credit FROM articles a LEFT JOIN categories c ON c.id = a.category_id LEFT JOIN media m ON m.id = a.featured_media_id';
        const params = []; const where = [];
        if (filters.status) { where.push('a.status = ?'); params.push(filters.status); }
        if (filters.category_id) { where.push('a.category_id = ?'); params.push(filters.category_id); }
        if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
        const columns = { title: 'a.title', category_name: 'c.name', created_at: 'a.created_at' };
        const direction = pagination.direction === 'asc' ? 'ASC' : 'DESC';
        const order = pagination.sortBy === 'status' ? `CASE a.status WHEN 'draft' THEN 0 WHEN 'review' THEN 1 WHEN 'scheduled' THEN 2 WHEN 'published' THEN 3 WHEN 'archived' THEN 4 ELSE 5 END ${direction}` : `${columns[pagination.sortBy] || 'a.created_at'} ${direction}`;
        sql += ` ORDER BY ${order}, a.id ASC LIMIT ? OFFSET ?`; params.push(parseInt(pagination.limit), parseInt(pagination.offset));
        return db.query(sql, params);
    }

    async findById(id) {
        const rows = await db.query(`SELECT a.*, t.name AS topic, m.filepath AS featured_media_path, m.credit AS featured_image_credit FROM articles a LEFT JOIN topics t ON t.id = a.topic_id LEFT JOIN media m ON m.id = a.featured_media_id WHERE a.id = ?`, [id]);
        return rows[0];
    }

    async update(id, data) {
        const fields = []; const params = [];
        const allowed = ['title', 'slug', 'excerpt', 'content', 'featured_image', 'featured_media_id', 'status', 'category_id', 'seo_title', 'seo_description', 'seo_keywords', 'published_at', 'scheduled_at'];
        for (const [key, value] of Object.entries(data)) if (allowed.includes(key)) { fields.push(`${key} = ?`); params.push(key === 'content' && typeof value === 'string' ? sanitizeArticleHtml(value) : value ?? null); }
        if (!fields.length) return null;
        if (data.status === 'published' && !data.published_at) fields.push('published_at = COALESCE(published_at, CURRENT_TIMESTAMP)');
        params.push(id); await db.query(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`, params); return true;
    }

    async delete(id) { await db.query('DELETE FROM articles WHERE id = ?', [id]); return true; }
}

module.exports = new ArticleModel();
