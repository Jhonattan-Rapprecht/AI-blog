const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePort, connectionOptions } = require('../src/config/database-connection');

const base = { DB_HOST: '127.0.0.1', DB_PORT: '3307', DB_USER: 'test', DB_PASSWORD: 'test-password', DB_NAME: 'isolated_test' };

test('database connections pass an explicit validated port to mysql2 options', () => {
    assert.equal(connectionOptions(base).port, 3307);
    assert.equal(connectionOptions({ ...base, DB_PORT: undefined }).port, 3306);
});

test('invalid explicit ports are rejected instead of silently using 3306', () => {
    for (const value of ['', 'abc', '0', '65536', '-1']) assert.throws(() => parsePort(value, { required: true }), /DB_PORT/);
});

test('isolated integration mode requires an explicit port', () => {
    assert.throws(() => connectionOptions({ ...base, DB_PORT: undefined }, { required: true }), /DB_PORT is required/);
});
