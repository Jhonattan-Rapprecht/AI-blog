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
CREATE USER IF NOT EXISTS '${FIXTURE_ADMIN_USER}'@'%' IDENTIFIED BY '${FIXTURE_ADMIN_PASSWORD}';
GRANT ALL PRIVILEGES ON *.* TO '${FIXTURE_ADMIN_USER}'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SQL
