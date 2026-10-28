// Explicitly invoked fixture-only scenario; never imported by application startup.
const crypto = require('crypto');
const fs = require('fs');

const { readDockerMetadata } = require('../docker-isolation');
const { assertMigrationHistory } = require('../../src/services/migration-history.service');
const { applyMigrations, createMigrationConnection, ensureHistory, inspect, loadMigrations, main } = require('../migrate');
const { discoverFixtureContainer } = require('./fixture-discovery');

const FIXTURE_PREFIX = 'ai_blog_stage3_fixture_';
const MISSING_INDEX = 'idx_articles_published_at';
const FIXTURE_PROJECT = 'ai-blog-stage3-fixtures';
const FIXTURE_HOST = '127.0.0.1';
const FIXTURE_PORT = '33310';

function loadFixtureCredentials(configPath) {
    return Object.fromEntries(fs.readFileSync(configPath, 'utf8').trim().split(/\r?\n/).map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
    }));
}

function createFixtureSchemaName() {
    const schema = `${FIXTURE_PREFIX}incompatible_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    if (!new RegExp(`^${FIXTURE_PREFIX}[a-z0-9_]+$`).test(schema) || schema.length > 64) {
        throw new Error('Generated fixture schema name is invalid.');
    }
    return schema;
}

function createFixtureEnvironment(credentials, containerId, database) {
    return {
        DB_INTEGRATION_TEST_MODE: 'true', DB_HOST: FIXTURE_HOST, DB_PORT: FIXTURE_PORT,
        DB_NAME: database, DB_USER: credentials.FIXTURE_ADMIN_USER, DB_PASSWORD: credentials.FIXTURE_ADMIN_PASSWORD,
        DB_TEST_HOST: FIXTURE_HOST, DB_TEST_PORT: FIXTURE_PORT, DB_TEST_NAME: database,
        DB_TEST_DOCKER_PROJECT: FIXTURE_PROJECT, DB_TEST_CONTAINER_ID: containerId,
        DB_TEST_DATABASE_LABEL: credentials.FIXTURE_RUNTIME_DATABASE
    };
}

function assertOwnedFixtureSchema(schema) {
    if (!new RegExp(`^${FIXTURE_PREFIX}[a-z0-9_]+$`).test(schema) || schema.length > 64) {
        throw new Error('Cleanup refused: invalid fixture schema name.');
    }
}

async function assertSchemaDoesNotExist(connection, schema) {
    const [rows] = await connection.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [schema]);
    if (rows.length > 0) throw new Error('Fixture schema already exists; refusing to reuse it.');
}

async function assertSafeIndexForRemoval(connection, schema) {
    const [indexes] = await connection.query(
        'SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
        [schema, 'articles', MISSING_INDEX]
    );
    if (indexes.length !== 1) throw new Error(`Fixture index ${MISSING_INDEX} is missing or ambiguous.`);

    const [foreignKeys] = await connection.query(
        `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [schema, 'articles', 'published_at']
    );
    if (foreignKeys.length > 0) {
        throw new Error(`Refusing to remove ${MISSING_INDEX}: published_at has a foreign-key dependency.`);
    }
}

async function closeConnection(connection) {
    if (connection) await connection.end();
}

async function migrationHistoryCount(connection) {
    try {
        const [rows] = await connection.query('SELECT COUNT(*) AS count FROM schema_migrations');
        return Number(rows[0]?.count || 0);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') return 0;
        throw error;
    }
}

function redactDiagnostic(value) {
    return String(value || '')
        .replace(/(password|pwd)=([^\s;&]+)/gi, '$1=[REDACTED]')
        .replace(/(mysql:\/\/[^:\s]+:)[^@\s]+@/gi, '$1[REDACTED]@');
}

function formatFixtureFailure(error) {
    const state = error.fixtureState || {};
    return {
        name: error.name || 'Error',
        message: redactDiagnostic(error.message),
        code: error.code || null,
        stack: redactDiagnostic(error.stack),
        phase: state.failurePhase || state.phase || 'unknown',
        schema: state.schema || null,
        cleanupSucceeded: state.cleanupSucceeded === true,
        cleanupError: state.cleanupError || null
    };
}

function isExpectedStartupRejection(errorMessage) {
    return /database schema is behind migration 1\./i.test(String(errorMessage || ''));
}

async function run(configPath) {
    const credentials = loadFixtureCredentials(configPath);
    const containerId = discoverFixtureContainer();
    readDockerMetadata(containerId);
    const schema = createFixtureSchemaName();
    const articleId = crypto.randomUUID();
    let connection;
    let schemaCreated = false;
    const state = { phase: 'preflight', schema, cleanupSucceeded: false, cleanupError: null };
    let primaryError;

    try {
        state.phase = 'create-fixture-schema';
        connection = await createMigrationConnection(createFixtureEnvironment(credentials, containerId, credentials.FIXTURE_RUNTIME_DATABASE));
        await assertSchemaDoesNotExist(connection, schema);
        await connection.query(`CREATE DATABASE \`${schema}\``);
        schemaCreated = true;
        await closeConnection(connection);
        connection = null;

        connection = await createMigrationConnection(createFixtureEnvironment(credentials, containerId, schema));
        state.phase = 'apply-production-migrations';
        const migrations = await loadMigrations();
        await ensureHistory(connection);
        await applyMigrations({ connection, migrations, applied: [] });
        await connection.query('INSERT INTO articles (id, title, slug, content) VALUES (?, ?, ?, ?)', [articleId, 'Incompatible legacy', `legacy-${articleId}`, '<p>preserve</p>']);
        const [before] = await connection.query('SELECT id, title, content FROM articles WHERE id = ?', [articleId]);

        state.phase = 'construct-incompatible-legacy-schema';
        await connection.query('DROP TABLE schema_migrations');
        await assertSafeIndexForRemoval(connection, schema);
        await connection.query(`ALTER TABLE articles DROP INDEX \`${MISSING_INDEX}\``);
        const report = await inspect(connection);
        const historyBeforeBaseline = await migrationHistoryCount(connection);
        let startupError = '';
        try {
            assertMigrationHistory(migrations, []);
        } catch (error) {
            startupError = error.message;
        }
        await closeConnection(connection);
        connection = null;

        state.phase = 'baseline-rejection';
        Object.assign(process.env, createFixtureEnvironment(credentials, containerId, schema));
        process.argv = ['node', 'fixture', '--confirm-adopt-existing-schema'];
        let baselineError = '';
        try { await main('baseline'); } catch (error) { baselineError = error.message; }

        connection = await createMigrationConnection(createFixtureEnvironment(credentials, containerId, schema));
        state.phase = 'verify-rejection-and-data-preservation';
        const [after] = await connection.query('SELECT id, title, content FROM articles WHERE id = ?', [articleId]);
        const historyAfterBaseline = await migrationHistoryCount(connection);
        const reportAfterBaseline = await inspect(connection);
        const valid = !report.compatible &&
            report.indexes.articles.missingIndexes.includes(MISSING_INDEX) &&
            !reportAfterBaseline.compatible &&
            reportAfterBaseline.indexes.articles.missingIndexes.includes(MISSING_INDEX) &&
            historyBeforeBaseline === 0 && historyAfterBaseline === 0 &&
            JSON.stringify(before[0]) === JSON.stringify(after[0]) && /schema does not match/.test(baselineError);
        if (!valid || !isExpectedStartupRejection(startupError)) {
            throw new Error('Incompatible legacy fixture assertions failed.');
        }

        return { schema, missingIndex: MISSING_INDEX, baselineRejected: true, preserved: true };
    } catch (error) {
        primaryError = error;
        state.failurePhase = state.phase;
        throw error;
    } finally {
        let cleanupError;
        try {
            await closeConnection(connection);
            if (schemaCreated) {
                state.phase = 'cleanup';
                const currentContainerId = discoverFixtureContainer();
                if (currentContainerId !== containerId) throw new Error('Cleanup refused: fixture container identity changed.');
                readDockerMetadata(currentContainerId);
                assertOwnedFixtureSchema(schema);
                const cleanup = await createMigrationConnection(createFixtureEnvironment(credentials, currentContainerId, credentials.FIXTURE_RUNTIME_DATABASE));
                try { await cleanup.query(`DROP DATABASE \`${schema}\``); } finally { await closeConnection(cleanup); }
            }
            state.cleanupSucceeded = true;
        } catch (error) {
            cleanupError = error;
            state.cleanupError = { name: error.name || 'Error', message: redactDiagnostic(error.message), code: error.code || null };
        }
        if (primaryError) {
            primaryError.fixtureState = state;
            if (cleanupError) primaryError.cleanupError = cleanupError;
        } else if (cleanupError) {
            cleanupError.fixtureState = state;
            throw cleanupError;
        }
    }
}

if (require.main === module) {
    run(process.argv[2]).then((result) => console.log(JSON.stringify(result))).catch((error) => {
        console.error(JSON.stringify(formatFixtureFailure(error), null, 2));
        process.exitCode = 1;
    });
}

module.exports = { FIXTURE_PREFIX, MISSING_INDEX, createFixtureSchemaName, formatFixtureFailure, isExpectedStartupRejection, migrationHistoryCount, run };
