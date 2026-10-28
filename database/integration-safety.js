function assertIsolatedTarget(env, metadata) {
    if (env.DB_INTEGRATION_TEST_MODE !== 'true') return;
    const required = ['DB_PORT', 'DB_TEST_HOST', 'DB_TEST_PORT', 'DB_TEST_NAME', 'DB_TEST_DOCKER_PROJECT', 'DB_TEST_CONTAINER_ID'];
    const missing = required.filter((key) => !env[key]);
    if (missing.length) throw new Error(`Isolated database guard requires: ${missing.join(', ')}`);
    if (env.DB_HOST !== env.DB_TEST_HOST || env.DB_PORT !== env.DB_TEST_PORT || env.DB_NAME !== env.DB_TEST_NAME) throw new Error('Isolated database endpoint does not match the approved test target.');
    if (String(env.DB_PORT) === '3306') throw new Error('Isolated database guard refuses the default MySQL endpoint.');
    if (!metadata || !metadata.running || metadata.id !== env.DB_TEST_CONTAINER_ID || metadata.project !== env.DB_TEST_DOCKER_PROJECT || metadata.hostPort !== env.DB_TEST_PORT || metadata.hostIp !== '127.0.0.1' || metadata.containerPort !== '3306') throw new Error('Docker metadata does not match the approved disposable database container.');
    if (env.DB_TEST_DATABASE_LABEL && metadata.databaseIdentity !== env.DB_TEST_DATABASE_LABEL) throw new Error('Docker database identity label does not match the approved fixture target.');
}
module.exports = { assertIsolatedTarget };
