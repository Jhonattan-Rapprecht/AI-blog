const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const initializers = [
    '01-fixture-admin.sh',
    '02-restrict-runtime.sh'
];

function sourceFor(initializer) {
    return fs.readFileSync(path.join(__dirname, '../database/testing/fixtures/init', initializer), 'utf8');
}

test('fixture initializers keep root credentials out of mysql process arguments', () => {
    for (const initializer of initializers) {
        const source = sourceFor(initializer);
        assert.doesNotMatch(source, /mysql[^\n]*\s-p(?:\s|"|\$|\{)/);
        assert.match(source, /--defaults-extra-file="\$credentials_file"/);
        assert.match(source, /umask 077/);
        assert.match(source, /mktemp \/tmp\/ai-blogstage3-mysql\.XXXXXX\.cnf/);
        assert.match(source, /trap cleanup_credentials EXIT HUP INT TERM/);
        assert.match(source, /rm -f "\$credentials_file"/);
        assert.match(source, /MYSQL_ROOT_PASSWORD:\?Fixture root credential is required/);
        assert.match(source, /set \+x/);
    }
});

test('fixture initializer privilege SQL remains unchanged', () => {
    const administrator = sourceFor('01-fixture-admin.sh');
    const runtime = sourceFor('02-restrict-runtime.sh');

    assert.match(administrator, /CREATE USER IF NOT EXISTS '\$\{FIXTURE_ADMIN_USER\}'@'%'/);
    assert.match(administrator, /GRANT ALL PRIVILEGES ON \*\.\* TO '\$\{FIXTURE_ADMIN_USER\}'@'%' WITH GRANT OPTION/);
    assert.match(runtime, /REVOKE ALL PRIVILEGES, GRANT OPTION FROM '\$\{MYSQL_USER\}'@'%'/);
    assert.match(runtime, /GRANT SELECT, INSERT, UPDATE, DELETE ON/);
});
