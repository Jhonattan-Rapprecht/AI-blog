#!/bin/bash
set -euo pipefail
set +x

: "${MYSQL_ROOT_PASSWORD:?Fixture root credential is required.}"

umask 077
credentials_file="$(mktemp /tmp/ai-blogstage3-mysql.XXXXXX.cnf)"
cleanup_credentials() {
    rm -f "$credentials_file"
}
trap cleanup_credentials EXIT HUP INT TERM

printf '[client]\nuser=root\nprotocol=socket\npassword=%s\n' "$MYSQL_ROOT_PASSWORD" > "$credentials_file"

mysql --defaults-extra-file="$credentials_file" <<SQL
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${MYSQL_USER}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
