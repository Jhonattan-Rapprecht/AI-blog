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
                    filepath VARCHAR(500) NOT NULL,
                    mime_type VARCHAR(100) NOT NULL,
                    file_size BIGINT UNSIGNED NOT NULL,
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
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME = 'credit'
                `);
                if (!columns.length) await db.query('ALTER TABLE media ADD COLUMN credit VARCHAR(500) NULL AFTER prompt');
            }).catch((error) => { this.ready = null; throw error; });
        }
        return this.ready;
    }

    async create(item) {
        await this.ensureTable();
        const id = uuidv4();
        await db.query(`INSERT INTO media
            (id, filename, filepath, mime_type, file_size, width, height, provider, prompt, credit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.filename, item.filepath, item.mime_type, item.file_size, item.width || null, item.height || null, item.provider || 'upload', item.prompt || null, item.credit || null]);
        return { id, ...item };
    }

    async findAll() {
        await this.ensureTable();
        return db.query('SELECT * FROM media ORDER BY created_at DESC');
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
        const usage = await db.query('SELECT COUNT(*) AS count FROM articles WHERE featured_media_id = ?', [id]);
        if (Number(usage[0]?.count) > 0) return { inUse: true };
        await db.query('DELETE FROM media WHERE id = ?', [id]);
        return rows[0];
    }
}

module.exports = new MediaModel();
