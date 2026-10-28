const { compareApplied } = require('../migration-utils');
const { assertIsolatedTarget } = require('../integration-safety');

const FIXTURE_NAME = /^ai_blog_stage3_fixture_[a-z0-9_]+$/;

function assertFixtureName(name) {
    if (!FIXTURE_NAME.test(String(name))) throw new Error('Fixture database name is not approved.');
    return name;
}

function evaluateMigrationHistory(migrations, applied) {
    const state = compareApplied(migrations, applied);
    if (state.mismatches.length) return { safe: false, reason: 'checksum-mismatch', state };
    if (state.unknownApplied.length) return { safe: false, reason: 'unknown-version', state };
    if (state.pending.length) return { safe: false, reason: 'pending-migrations', state };
    return { safe: true, state };
}

async function withVerifiedFixture(env, metadata, connect, work) {
    assertFixtureName(env.DB_NAME);
    assertIsolatedTarget(env, metadata);
    const connection = await connect();
    try { return await work(connection); }
    finally { if (connection?.end) await connection.end(); }
}

async function runProductionFixture({ env, metadata, connect, migrations, appliedHistory, inspectSchema, assertStartup }) {
    return withVerifiedFixture(env, metadata, connect, async (connection) => {
        const applied = await appliedHistory(connection);
        const migration = evaluateMigrationHistory(migrations, applied);
        const schema = await inspectSchema(connection);
        const startup = await assertStartup();
        return { migration, schema, startup };
    });
}

async function runControlledPartialFailure(connection, steps) {
    const completed = [];
    for (const step of steps) {
        try { await connection.query(step.sql); completed.push(step.name); }
        catch (error) {
            return { completed, failed: step.name, recorded: false, recovery: 'Inspect partial DDL and apply a reviewed forward migration.' };
        }
    }
    return { completed, failed: null, recorded: true };
}

function validateBaseline({ confirmed, report, migrations, applied }) {
    if (!confirmed) return { accepted: false, reason: 'confirmation-required' };
    if (applied.length) return { accepted: false, reason: 'history-exists' };
    if (!report.compatible) return { accepted: false, reason: 'schema-incompatible' };
    return { accepted: true, rows: migrations.map(({ version, name, checksum }) => ({ version, name, checksum })) };
}

module.exports = { assertFixtureName, evaluateMigrationHistory, withVerifiedFixture, runProductionFixture, runControlledPartialFailure, validateBaseline };
