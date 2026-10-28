function parsePort(value, { required = false } = {}) {
    if (value === undefined || value === '') {
        if (required) throw new Error('DB_PORT is required for isolated integration testing.');
        return 3306;
    }
    if (!/^\d+$/.test(String(value))) throw new Error('DB_PORT must be an integer between 1 and 65535.');
    const port = Number(value);
    if (port < 1 || port > 65535) throw new Error('DB_PORT must be an integer between 1 and 65535.');
    return port;
}

function connectionOptions(env = process.env, options = {}) {
    const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missing = required.filter((name) => !env[name]);
    if (missing.length) throw new Error(`Missing required database configuration: ${missing.join(', ')}`);
    return { host: env.DB_HOST, port: parsePort(env.DB_PORT, options), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME };
}

module.exports = { parsePort, connectionOptions };
