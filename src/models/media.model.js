const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class MediaModel {
    constructor() { this.ready = null; }

    ensureTable() {
        if (!this.ready) {
            this.ready = db.query(`
                CREATE TABLE IF NOT EXISTS media (
                    id CHAR(36) PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL,
                    filepath VARCHAR(500) NULL,
                    mime_type VARCHAR(100) NOT NULL,
                    file_size BIGINT UNSIGNED NOT NULL,
                    media_type ENUM('image', 'video') NOT NULL DEFAULT 'image',
                    source_type ENUM('upload', 'link') NOT NULL DEFAULT 'upload',
                    source_url VARCHAR(2048) NULL,
                    thumbnail_url VARCHAR(2048) NULL,
                    width INT UNSIGNED NULL,
                    height INT UNSIGNED NULL,
                    provider VARCHAR(50) NOT NULL DEFAULT 'upload',
                    prompt TEXT NULL,
                    credit VARCHAR(500) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_media_created_at (created_at)
                )
            `).then(async () => {
                const columns = await db.query(`
                    SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media'
                `);
                const names = new Set(columns.map((column) => column.COLUMN_NAME));
                if (columns.find((column) => column.COLUMN_NAME === 'filepath')?.IS_NULLABLE === 'NO') await db.query('ALTER TABLE media MODIFY filepath VARCHAR(500) NULL');
                if (!names.has('media_type')) await db.query("ALTER TABLE media ADD COLUMN media_type ENUM('image', 'video') NOT NULL DEFAULT 'image' AFTER file_size");
                if (!names.has('source_type')) await db.query("ALTER TABLE media ADD COLUMN source_type ENUM('upload', 'link') NOT NULL DEFAULT 'upload' AFTER media_type");
                if (!names.has('source_url')) await db.query('ALTER TABLE media ADD COLUMN source_url VARCHAR(2048) NULL AFTER source_type');
                if (!names.has('thumbnail_url')) await db.query('ALTER TABLE media ADD COLUMN thumbnail_url VARCHAR(2048) NULL AFTER source_url');
                const creditColumns = await db.query(`
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME = 'credit'
                `);
                if (!creditColumns.length) await db.query('ALTER TABLE media ADD COLUMN credit VARCHAR(500) NULL AFTER prompt');
            }).catch((error) => { this.ready = null; throw error; });
        }
        return this.ready;
    }

    async create(item) {
        await this.ensureTable();
        const id = uuidv4();
        await db.query(`INSERT INTO media
            (id, filename, filepath, mime_type, file_size, media_type, source_type, source_url, thumbnail_url, width, height, provider, prompt, credit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.filename, item.filepath || null, item.mime_type, item.file_size || 0, item.media_type || 'image', item.source_type || 'upload', item.source_url || null, item.thumbnail_url || null, item.width || null, item.height || null, item.provider || 'upload', item.prompt || null, item.credit || null]);
        return { id, ...item };
    }

    async findAll(type = 'image') {
        await this.ensureTable();
        if (type === 'all') return db.query('SELECT * FROM media ORDER BY created_at DESC');
        return db.query('SELECT * FROM media WHERE media_type = ? ORDER BY created_at DESC', [type === 'video' ? 'video' : 'image']);
    }

    async findById(id) {
        await this.ensureTable();
        const rows = await db.query('SELECT * FROM media WHERE id = ? LIMIT 1', [id]);
        return rows[0];
    }

    async updateCredit(id, credit) {
        await this.ensureTable();
        const value = typeof credit === 'string' ? credit.trim().slice(0, 500) : '';
        const result = await db.query('UPDATE media SET credit = ? WHERE id = ?', [value || null, id]);
        if (!result.affectedRows) {
            const existing = await this.findById(id);
            return existing ? { ...existing, credit: value || null } : null;
        }
        return this.findById(id);
    }

    async delete(id) {
        await this.ensureTable();
        const rows = await db.query('SELECT * FROM media WHERE id = ? LIMIT 1', [id]);
        if (!rows[0]) return null;
        const usage = await db.query(`SELECT COUNT(*) AS count FROM articles
            WHERE featured_media_id = ?
                OR (? IS NOT NULL AND LOCATE(?, content) > 0)
                OR (? IS NOT NULL AND LOCATE(?, content) > 0)`, [id, rows[0].filepath, rows[0].filepath, rows[0].source_url, rows[0].source_url]);
        if (Number(usage[0]?.count) > 0) return { inUse: true, ...rows[0] };
        await db.query('DELETE FROM media WHERE id = ?', [id]);
        return rows[0];
    }
}

module.exports = new MediaModel();
