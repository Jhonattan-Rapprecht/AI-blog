const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const MediaModel = require('./media.model');
const { sanitizeArticleHtml } = require('../utils/htmlSanitizer');

class ArticleModel {
    constructor() { this.mediaColumnReady = null; this.topicSchemaReady = null; }

    async getOrCreateTopicId(value) {
        const name = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 500);
        if (!name) throw new Error('An article topic is required.');
        const normalizedHash = crypto.createHash('sha256').update(name.toLowerCase()).digest('hex');
        await db.query('INSERT IGNORE INTO topics (id, name, normalized_hash) VALUES (?, ?, ?)', [uuidv4(), name, normalizedHash]);
        const rows = await db.query('SELECT id FROM topics WHERE normalized_hash = ? LIMIT 1', [normalizedHash]);
        if (!rows[0]) throw new Error('Could not save the article topic.');
        return rows[0].id;
    }

    async ensureTopicSchema() {
        if (!this.topicSchemaReady) {
            this.topicSchemaReady = (async () => {
                await db.query(`CREATE TABLE IF NOT EXISTS topics (
                    id CHAR(36) PRIMARY KEY,
                    name VARCHAR(500) NOT NULL,
                    normalized_hash CHAR(64) NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`);
                let topicIdColumn = await db.query(`
                    SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'articles' AND COLUMN_NAME = 'topic_id'
                `);
                let shouldBackfillLegacyTopics = topicIdColumn.length === 0;
                if (!topicIdColumn.length) {
                    await db.query('ALTER TABLE articles ADD COLUMN topic_id CHAR(36) NULL');
                    topicIdColumn = [{ IS_NULLABLE: 'YES' }];
                }
                const directTopicColumn = await db.query(`
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'articles' AND COLUMN_NAME = 'topic'
                `);
                shouldBackfillLegacyTopics ||= directTopicColumn.length > 0;
                const legacyRows = shouldBackfillLegacyTopics ? await db.query(`
                    SELECT a.id, ${directTopicColumn.length ? 'a.topic' : 'NULL AS topic'},
                        (SELECT CASE WHEN JSON_VALID(g.prompt) THEN NULLIF(JSON_UNQUOTE(JSON_EXTRACT(g.prompt, '$.topic')), '') ELSE NULL END
                         FROM ai_generations g WHERE g.article_id = a.id AND g.status = 'completed'
                         ORDER BY g.created_at DESC, g.id DESC LIMIT 1) AS generated_topic
                    FROM articles a WHERE a.topic_id IS NULL
                `) : [];
                for (const row of legacyRows) {
                    const topic = row.topic?.trim() || row.generated_topic?.trim();
                    if (!topic) continue;
                    const topicId = await this.getOrCreateTopicId(topic);
                    await db.query('UPDATE articles SET topic_id = ? WHERE id = ? AND topic_id IS NULL', [topicId, row.id]);
                }

                if (directTopicColumn.length) await db.query('ALTER TABLE articles DROP COLUMN topic');

                const indexes = await db.query(`
                    SELECT DISTINCT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'articles' AND COLUMN_NAME = 'topic_id'
                `);
                if (!indexes.length) await db.query('CREATE INDEX idx_articles_topic_id ON articles(topic_id)');

                const constraints = await db.query(`
                    SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'articles'
                      AND COLUMN_NAME = 'topic_id' AND REFERENCED_TABLE_NAME = 'topics'
                `);
                if (!constraints.length) {
                    await db.query('ALTER TABLE articles ADD CONSTRAINT fk_articles_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE RESTRICT');
                }

                const currentTopicColumn = await db.query(`
                    SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'articles' AND COLUMN_NAME = 'topic_id'
                `);
                if (currentTopicColumn[0]?.IS_NULLABLE === 'NO') await db.query('ALTER TABLE articles MODIFY topic_id CHAR(36) NULL');
            })().catch((error) => { this.topicSchemaReady = null; throw error; });
        }
        return this.topicSchemaReady;
    }

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
        await this.ensureTopicSchema();
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
            (id, title, slug, excerpt, content, featured_image, featured_media_id, status, category_id, topic_id, author_id, seo_title, seo_description, seo_keywords, published_at, scheduled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(sql, [
            id,
            title ?? null,
            slug ?? null,
            excerpt ?? null,
            typeof content === 'string' ? sanitizeArticleHtml(content) : content ?? null,
            featured_image ?? null,
            featured_media_id ?? null,
            status ?? 'draft',
            category_id ?? null,
            null,
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
        await this.ensureTopicSchema();
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

        const sortColumns = {
            title: 'a.title',
            category_name: 'c.name',
            created_at: 'a.created_at'
        };
        const sortDirection = pagination.direction === 'asc' ? 'ASC' : 'DESC';
        const sortOrder = pagination.sortBy === 'status'
            ? `CASE a.status WHEN 'draft' THEN 0 WHEN 'review' THEN 1 WHEN 'scheduled' THEN 2 WHEN 'published' THEN 3 WHEN 'archived' THEN 4 ELSE 5 END ${sortDirection}`
            : `${sortColumns[pagination.sortBy] || 'a.created_at'} ${sortDirection}`;
        sql += ` ORDER BY ${sortOrder}, a.id ASC LIMIT ? OFFSET ?`;
        params.push(parseInt(pagination.limit), parseInt(pagination.offset));

        return await db.query(sql, params);
    }

    async findById(id) {
        await this.ensureMediaColumn();
        await this.ensureTopicSchema();
        const sql = `SELECT a.*, t.name AS topic, m.filepath AS featured_media_path, m.credit AS featured_image_credit
                     FROM articles a LEFT JOIN topics t ON t.id = a.topic_id LEFT JOIN media m ON m.id = a.featured_media_id WHERE a.id = ?`;
        const results = await db.query(sql, [id]);
        return results[0];
    }

    async update(id, data) {
        await this.ensureMediaColumn();
        await this.ensureTopicSchema();
        const fields = [];
        const params = [];

        const allowed = ['title', 'slug', 'excerpt', 'content', 'featured_image', 'featured_media_id', 'status', 'category_id',
            'seo_title', 'seo_description', 'seo_keywords', 'published_at', 'scheduled_at'];

        for (const [key, value] of Object.entries(data)) {
            if (!allowed.includes(key)) continue;
            fields.push(`${key} = ?`);
            params.push(key === 'content' && typeof value === 'string' ? sanitizeArticleHtml(value) : value ?? null);
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
