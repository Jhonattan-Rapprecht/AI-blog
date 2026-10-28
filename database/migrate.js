/* Explicit migration runner. It is never imported by the application server. */
require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const { checksum, orderMigrations, compareApplied } = require('./migration-utils');
const { requiredTables, requiredIndexes } = require('./schema-manifest');
const { connectionOptions: buildConnectionOptions } = require('../src/config/database-connection');
const { assertIsolatedTarget } = require('./integration-safety');
const { readDockerMetadata } = require('./docker-isolation');

const migrationsDir = path.join(__dirname, 'migrations');
const LOCK_NAME = 'ai_blogstudio_schema_migrations';

async function loadMigrations() {
    const names = await fs.readdir(migrationsDir, { withFileTypes: true });
    const files = await Promise.all(names.filter((entry) => entry.isFile() && entry.name.endsWith('.sql')).map(async (entry) => ({ name: entry.name, sql: await fs.readFile(path.join(migrationsDir, entry.name), 'utf8') })));
    return orderMigrations(files.map((file) => ({ ...file, checksum: checksum(file.sql) })));
}
function connectionOptions() { return { ...buildConnectionOptions(process.env, { required: process.env.DB_INTEGRATION_TEST_MODE === 'true' }), multipleStatements: true }; }
async function createMigrationConnection(env = process.env, createConnection = mysql.createConnection, inspectDocker = readDockerMetadata) {
    const options = { ...buildConnectionOptions(env, { required: env.DB_INTEGRATION_TEST_MODE === 'true' }), multipleStatements: true };
    if (env.DB_INTEGRATION_TEST_MODE === 'true') assertIsolatedTarget(env, inspectDocker(env.DB_TEST_CONTAINER_ID));
    return createConnection(options);
}
async function inspect(connection) {
    const report = { compatible: true, tables: {}, indexes: {} };
    for (const [table, expectedColumns] of Object.entries(requiredTables)) {
        const [columns] = await connection.query('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
        const actual = new Set(columns.map((row) => row.COLUMN_NAME));
        const missingColumns = expectedColumns.filter((column) => !actual.has(column));
        report.tables[table] = { exists: columns.length > 0, missingColumns };
        if (!columns.length || missingColumns.length) report.compatible = false;
    }
    for (const [table, expected] of Object.entries(requiredIndexes)) {
        const [rows] = await connection.query('SELECT DISTINCT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
        const actual = new Set(rows.map((row) => row.INDEX_NAME));
        const missingIndexes = expected.filter((index) => !actual.has(index));
        report.indexes[table] = { missingIndexes };
        if (missingIndexes.length) report.compatible = false;
    }
    return report;
}
async function ensureHistory(connection) {
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        version INT UNSIGNED PRIMARY KEY, name VARCHAR(255) NOT NULL, checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )`);
}
async function appliedHistory(connection) {
    try { const [rows] = await connection.query('SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version'); return rows; }
    catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') return [];
        throw error;
    }
}
async function applyMigrations({ connection, migrations, applied }) {
    const state = compareApplied(migrations, applied);
    if (state.mismatches.length || state.unknownApplied.length) throw new Error(`Migration history is inconsistent: ${JSON.stringify({ mismatches: state.mismatches, unknownApplied: state.unknownApplied.map((row) => row.version) })}`);
    for (const migration of state.pending) {
        try { await connection.query(migration.sql); await connection.query('INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)', [migration.version, migration.name, migration.checksum]); }
        catch (error) { throw new Error(`Migration ${migration.version}_${migration.name} failed. MySQL DDL may be partially applied; inspect the schema and recover with a reviewed forward fix. Cause: ${error.code || error.name}`); }
    }
    return state.pending.length;
}
async function main(command = process.argv[2] || 'status') {
    if (!['status', 'migrate', 'verify', 'inspect', 'baseline'].includes(command)) throw new Error('Usage: db:migrate[:status|:verify|:inspect|:baseline]');
    const connection = await createMigrationConnection();
    let locked = false;
    try {
        const [lock] = await connection.query('SELECT GET_LOCK(?, 30) AS acquired', [LOCK_NAME]);
        if (Number(lock[0]?.acquired) !== 1) throw new Error('Could not acquire the migration advisory lock within 30 seconds.');
        locked = true;
        const migrations = await loadMigrations();
        if (command === 'inspect') { console.log(JSON.stringify(await inspect(connection), null, 2)); return; }
        if (command === 'migrate' || command === 'baseline') await ensureHistory(connection);
        const applied = await appliedHistory(connection);
        const state = compareApplied(migrations, applied);
        if (state.mismatches.length || state.unknownApplied.length) throw new Error(`Migration history is inconsistent: ${JSON.stringify({ mismatches: state.mismatches, unknownApplied: state.unknownApplied.map((row) => row.version) })}`);
        if (command === 'status' || command === 'verify') { console.log(JSON.stringify({ applied, pending: state.pending.map(({ version, name }) => ({ version, name })), verified: state.pending.length === 0 }, null, 2)); if (command === 'verify' && state.pending.length) process.exitCode = 1; return; }
        if (command === 'baseline') {
            if (!process.argv.includes('--confirm-adopt-existing-schema')) throw new Error('Baseline is refused without --confirm-adopt-existing-schema. Run db:migrate:inspect and review its output first.');
            if (applied.length) throw new Error('Baseline is only allowed for a database without migration history.');
            const report = await inspect(connection);
            if (!report.compatible) throw new Error('Baseline refused: the existing schema does not match the required manifest. Use forward remediation or manual review.');
            for (const migration of migrations) await connection.query('INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)', [migration.version, migration.name, migration.checksum]);
            console.log('Baseline recorded after explicit confirmation.'); return;
        }
        console.log(`Applied ${await applyMigrations({ connection, migrations, applied })} migration(s).`);
    } finally { if (locked) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]); await connection.end(); }
}
if (require.main === module) main().catch((error) => { console.error(`[Migration] ${error.message}`); process.exitCode = 1; });
module.exports = { loadMigrations, inspect, ensureHistory, appliedHistory, applyMigrations, main, createMigrationConnection, connectionOptions };
