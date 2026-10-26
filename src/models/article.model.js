const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const MediaModel = require('./media.model');

class ArticleModel {
    constructor() { this.mediaColumnReady = null; }

    async ensureMediaColumn() {
        if (!this.mediaColumnReady) {
            this.mediaColumnReady = (async () => {
                await MediaModel.ensureTable();
                const columns = await db.query(`
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'articles' AND COLUMN_NAME = 'featured_media_id'
                `);
                if (!columns.length) {
                    await db.query('ALTER TABLE articles ADD COLUMN featured_media_id CHAR(36) NULL');
                }
                const constraints = await db.query(`
                    SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'articles'
                      AND COLUMN_NAME = 'featured_media_id' AND REFERENCED_TABLE_NAME = 'media'
                `);
                if (!constraints.length) {
                    await db.query(`ALTER TABLE articles ADD CONSTRAINT fk_articles_featured_media
                        FOREIGN KEY (featured_media_id) REFERENCES media(id) ON DELETE SET NULL`);
                }
            })().catch((error) => { this.mediaColumnReady = null; throw error; });
        }
        return this.mediaColumnReady;
    }

    async create(data) {
        await this.ensureMediaColumn();
        const {
            title = null,
            slug = null,
            excerpt = null,
            content = null,
            featured_image = null,
            featured_media_id = null,
            status = 'draft',
            category_id = null,
            author_id = null,
            seo_title = null,
            seo_description = null,
            seo_keywords = null,
            published_at = null,
            scheduled_at = null
        } = data;

        const id = uuidv4();
        const sql = `
            INSERT INTO articles
            (id, title, slug, excerpt, content, featured_image, featured_media_id, status, category_id, author_id, seo_title, seo_description, seo_keywords, published_at, scheduled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(sql, [
            id,
            title ?? null,
            slug ?? null,
            excerpt ?? null,
            content ?? null,
            featured_image ?? null,
            featured_media_id ?? null,
            status ?? 'draft',
            category_id ?? null,
            author_id ?? null,
            seo_title ?? null,
            seo_description ?? null,
            seo_keywords ?? null,
            published_at ?? (status === 'published' ? new Date() : null),
            scheduled_at ?? null
        ]);

        return id;
    }

    async findAll(filters = {}, pagination = { limit: 20, offset: 0 }) {
        await this.ensureMediaColumn();
        let sql = 'SELECT a.*, c.name AS category_name, m.filepath AS featured_media_path, m.credit AS featured_image_credit FROM articles a LEFT JOIN categories c ON c.id = a.category_id LEFT JOIN media m ON m.id = a.featured_media_id';
        const params = [];
        const whereClauses = [];

        if (filters.status) {
            whereClauses.push('a.status = ?');
            params.push(filters.status);
        }
        if (filters.category_id) {
            whereClauses.push('a.category_id = ?');
            params.push(filters.category_id);
        }

        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }

        sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(pagination.limit), parseInt(pagination.offset));

        return await db.query(sql, params);
    }

    async findById(id) {
        await this.ensureMediaColumn();
        const sql = `SELECT a.*, m.filepath AS featured_media_path, m.credit AS featured_image_credit
                     FROM articles a LEFT JOIN media m ON m.id = a.featured_media_id WHERE a.id = ?`;
        const results = await db.query(sql, [id]);
        return results[0];
    }

    async update(id, data) {
        await this.ensureMediaColumn();
        const fields = [];
        const params = [];

        const allowed = ['title', 'slug', 'excerpt', 'content', 'featured_image', 'featured_media_id', 'status', 'category_id',
            'seo_title', 'seo_description', 'seo_keywords', 'published_at', 'scheduled_at'];

        for (const [key, value] of Object.entries(data)) {
            if (!allowed.includes(key)) continue;
            fields.push(`${key} = ?`);
            params.push(value ?? null);
        }

        if (fields.length === 0) return null;

        // Publishing from the editor stamps the publish date once, so the article appears on the public site
        if (data.status === 'published' && !data.published_at) {
            fields.push('published_at = COALESCE(published_at, CURRENT_TIMESTAMP)');
        }

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
