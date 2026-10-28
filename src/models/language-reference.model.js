const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class LanguageReferenceModel {
    constructor() { this.ready = null; }

    ensureTable() {
        if (!this.ready) {
            this.ready = db.query(`CREATE TABLE IF NOT EXISTS language_references (
                id CHAR(36) PRIMARY KEY,
                language_id VARCHAR(10) NOT NULL,
                reference_type ENUM('spelling', 'grammar') NOT NULL,
                source_name VARCHAR(255) NOT NULL,
                license VARCHAR(255) NOT NULL,
                version VARCHAR(100) NOT NULL,
                source_reference VARCHAR(500) NOT NULL,
                checksum VARCHAR(128) NULL,
                review_state ENUM('planned', 'reviewed', 'approved') NOT NULL DEFAULT 'planned',
                validation_state ENUM('not-validated', 'verified') NOT NULL DEFAULT 'not-validated',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_language_references_language (language_id, reference_type),
                INDEX idx_language_references_review (review_state, validation_state)
            )`).catch((error) => { this.ready = null; throw error; });
        }
        return this.ready;
    }

    async list() {
        await this.ensureTable();
        return db.query(`SELECT id, language_id AS languageId, reference_type AS referenceType, source_name AS sourceName,
            license, version, source_reference AS sourceReference, checksum, review_state AS reviewState,
            validation_state AS validationState, created_at AS createdAt, updated_at AS updatedAt
            FROM language_references ORDER BY language_id, reference_type, updated_at DESC`);
    }

    async create(reference) {
        await this.ensureTable();
        const id = uuidv4();
        await db.query(`INSERT INTO language_references
            (id, language_id, reference_type, source_name, license, version, source_reference, checksum, review_state, validation_state)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, reference.languageId, reference.referenceType, reference.sourceName,
            reference.license, reference.version, reference.sourceReference, reference.checksum || null, reference.reviewState, reference.validationState]);
        return this.findById(id);
    }

    async findById(id) {
        await this.ensureTable();
        const rows = await db.query(`SELECT id, language_id AS languageId, reference_type AS referenceType, source_name AS sourceName,
            license, version, source_reference AS sourceReference, checksum, review_state AS reviewState,
            validation_state AS validationState, created_at AS createdAt, updated_at AS updatedAt
            FROM language_references WHERE id = ? LIMIT 1`, [id]);
        return rows[0] || null;
    }

    async update(id, reference) {
        await this.ensureTable();
        const result = await db.query(`UPDATE language_references SET language_id = ?, reference_type = ?, source_name = ?, license = ?,
            version = ?, source_reference = ?, checksum = ?, review_state = ?, validation_state = ? WHERE id = ?`,
        [reference.languageId, reference.referenceType, reference.sourceName, reference.license, reference.version,
            reference.sourceReference, reference.checksum || null, reference.reviewState, reference.validationState, id]);
        return result.affectedRows ? this.findById(id) : null;
    }

    async remove(id) {
        await this.ensureTable();
        const existing = await this.findById(id);
        if (!existing) return null;
        await db.query('DELETE FROM language_references WHERE id = ?', [id]);
        return existing;
    }
}

module.exports = new LanguageReferenceModel();
