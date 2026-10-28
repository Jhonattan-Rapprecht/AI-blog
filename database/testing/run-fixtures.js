const fs = require('fs');
const path = require('path');
const { readDockerMetadata } = require('../docker-isolation');
const { createMigrationConnection, loadMigrations, appliedHistory, inspect } = require('../migrate');
const { assertMigrationHistory } = require('../../src/services/migration-history.service');
const { assertFixtureName, runProductionFixture, withVerifiedFixture } = require('./fixture-runner');
const { discoverFixtureContainer } = require('./fixture-discovery');

const CONFIG = path.join(__dirname, 'fixtures', '.env');
const PROJECT = 'ai-blog-stage3-fixtures';
const PORT = '33310';

function readConfig(readFile = fs.readFileSync) {
  const values = Object.fromEntries(String(readFile(CONFIG, 'utf8')).trim().split(/\r?\n/).map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
  for (const key of ['FIXTURE_RUNTIME_DATABASE', 'FIXTURE_RUNTIME_USER', 'FIXTURE_RUNTIME_PASSWORD']) if (!values[key]) throw new Error(`Missing fixture configuration: ${key}`);
  assertFixtureName(values.FIXTURE_RUNTIME_DATABASE);
  return values;
}
function buildEnv(values, containerId) {
  return { DB_INTEGRATION_TEST_MODE: 'true', DB_HOST: '127.0.0.1', DB_PORT: PORT, DB_NAME: values.FIXTURE_RUNTIME_DATABASE, DB_USER: values.FIXTURE_RUNTIME_USER, DB_PASSWORD: values.FIXTURE_RUNTIME_PASSWORD, DB_TEST_HOST: '127.0.0.1', DB_TEST_PORT: PORT, DB_TEST_NAME: values.FIXTURE_RUNTIME_DATABASE, DB_TEST_DOCKER_PROJECT: PROJECT, DB_TEST_CONTAINER_ID: containerId, DB_TEST_DATABASE_LABEL: values.FIXTURE_RUNTIME_DATABASE };
}
function createStartupVerifier({ connect, migrations, readAppliedHistory }) {
  return async () => {
    const connection = await connect();
    try {
      const applied = await readAppliedHistory(connection);
      assertMigrationHistory(migrations, applied);
      return { ready: true };
    } finally {
      await connection.end();
    }
  };
}
async function execute(deps = {}) {
  const values = (deps.readConfig || readConfig)();
  const metadata = (deps.readDockerMetadata || readDockerMetadata)(deps.containerId || (deps.discover || discoverFixtureContainer)());
  const env = buildEnv(values, metadata.id);
  const connect = () => (deps.connect || createMigrationConnection)(env);
  const migrations = await (deps.loadMigrations || loadMigrations)();
  const readAppliedHistory = deps.appliedHistory || appliedHistory;
  return runProductionFixture({ env, metadata, connect, migrations, appliedHistory: readAppliedHistory, inspectSchema: deps.inspect || inspect, assertStartup: createStartupVerifier({ connect, migrations, readAppliedHistory }) });
}
async function preflight(deps = {}) {
  const values = (deps.readConfig || readConfig)();
  const metadata = (deps.readDockerMetadata || readDockerMetadata)(deps.containerId || (deps.discover || discoverFixtureContainer)());
  const env = buildEnv(values, metadata.id);
  return withVerifiedFixture(env, metadata, () => (deps.connect || createMigrationConnection)(env), async (connection) => {
    const [rows] = await connection.query('SELECT @@hostname AS server_hostname, @@port AS server_port, DATABASE() AS selected_database, CURRENT_USER() AS authenticated_user, @@version AS mysql_version');
    const row = rows[0];
    if (row.selected_database !== values.FIXTURE_RUNTIME_DATABASE || !String(row.authenticated_user).startsWith(`${values.FIXTURE_RUNTIME_USER}@`) || !String(row.mysql_version).startsWith('8.4.')) throw new Error('Fixture SQL identity mismatch.');
    return row;
  });
}
if (require.main === module) {
  const executeMode = process.argv.includes('--execute-fixtures'); const preflightMode = process.argv.includes('--preflight-only');
  if (executeMode === preflightMode) throw new Error('Select exactly one fixture mode.');
  const run = preflightMode ? preflight : execute;
  run().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(`[Fixture runner] ${error.message}`); process.exitCode = 1; });
}
module.exports = { readConfig, buildEnv, createStartupVerifier, execute, preflight, CONFIG, PROJECT, PORT };
