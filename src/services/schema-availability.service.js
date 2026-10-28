const db = require('../config/db');
const { loadMigrations } = require('../../database/migrate');
const { assertMigrationHistory } = require('./migration-history.service');

const REQUIRED_MIGRATION_VERSION = 4;

function assertMigrationVersion(rows, requiredVersion = REQUIRED_MIGRATION_VERSION) {
    if (Number(rows[0]?.version || 0) < requiredVersion) {
        throw new Error(`Database schema is behind migration ${requiredVersion}. Run \`npm run db:migrate:status\` and \`npm run db:migrate\` before starting the API.`);
    }
}


async function assertReady() {
    let rows;
    try {
        rows = await db.query('SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version');
    } catch (error) {
        const code = error?.code ? ` (${error.code})` : '';
        throw new Error(`Database migrations are not available${code}. Run \`npm run db:migrate:status\`, apply approved migrations, then restart the API.`);
    }
    try { assertMigrationHistory(await loadMigrations(), rows); }
    catch (error) { throw error; }
}

module.exports = { REQUIRED_MIGRATION_VERSION, assertMigrationVersion, assertReady };
