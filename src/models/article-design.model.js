const db = require('../config/db');
const { normalizeLayoutSelection, resolveArticleDesign } = require('../config/article-design.config');

const parseConfig = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return null; }
};

class ArticleDesignModel {
    constructor() { this.schemaReady = null; }

    async ensureSchema() {
        if (!this.schemaReady) {
            this.schemaReady = (async () => {
                await db.query(`CREATE TABLE IF NOT EXISTS publication_design_settings (
                    id TINYINT UNSIGNED PRIMARY KEY,
                    schema_version TINYINT UNSIGNED NOT NULL DEFAULT 1,
                    design_config JSON NOT NULL,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )`);
                await db.query(`CREATE TABLE IF NOT EXISTS article_design_overrides (
                    article_id CHAR(36) PRIMARY KEY,
                    design_config JSON NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
                )`);
                await db.query(`INSERT IGNORE INTO publication_design_settings (id, schema_version, design_config)
                    VALUES (1, 1, JSON_OBJECT('layout', 'classic'))`);
            })().catch((error) => { this.schemaReady = null; throw error; });
        }
        return this.schemaReady;
    }

    async getPublicationSelection() {
        await this.ensureSchema();
        const rows = await db.query('SELECT design_config, updated_at FROM publication_design_settings WHERE id = 1 LIMIT 1');
        const config = normalizeLayoutSelection(parseConfig(rows[0]?.design_config));
        return { selection: config || { layout: 'classic' }, updatedAt: rows[0]?.updated_at || null };
    }

    async setPublicationSelection(selection) {
        await this.ensureSchema();
        await db.query(`UPDATE publication_design_settings
            SET schema_version = 1, design_config = ? WHERE id = 1`, [JSON.stringify(selection)]);
        return this.getPublicationSelection();
    }

    async getArticleSelection(articleId) {
        await this.ensureSchema();
        const rows = await db.query('SELECT design_config, updated_at FROM article_design_overrides WHERE article_id = ? LIMIT 1', [articleId]);
        const selection = normalizeLayoutSelection(parseConfig(rows[0]?.design_config));
        return { selection, updatedAt: rows[0]?.updated_at || null };
    }

    async setArticleSelection(articleId, selection) {
        await this.ensureSchema();
        await db.query(`INSERT INTO article_design_overrides (article_id, design_config)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE design_config = VALUES(design_config), updated_at = CURRENT_TIMESTAMP`, [articleId, JSON.stringify(selection)]);
        return this.getArticleSelection(articleId);
    }

    async clearArticleSelection(articleId) {
        await this.ensureSchema();
        await db.query('DELETE FROM article_design_overrides WHERE article_id = ?', [articleId]);
    }

    async resolveForArticle(articleId) {
        const [publication, article] = await Promise.all([this.getPublicationSelection(), this.getArticleSelection(articleId)]);
        return {
            ...resolveArticleDesign(publication.selection, article.selection),
            source: article.selection ? 'article' : publication.selection ? 'publication' : 'fallback'
        };
    }
}

module.exports = new ArticleDesignModel();
