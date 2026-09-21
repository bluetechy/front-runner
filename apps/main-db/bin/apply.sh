#!/bin/bash
#
# Build the schema into a database.
#
# Usage: apply.sh <database>
#
# Applies every object under /sql to the named database in dependency order.
# It creates nothing but schema: seed data lives in /sql/Seeds and is applied
# separately by seed.sh, test fixtures by test.sh. The database itself must
# already exist.
#
set -euo pipefail

db_name="${1:?usage: apply.sh <database>}"
db_super="${POSTGRES_USER:-postgres}"
app_user="${APP_DB_USER:-root}"
sql_dir="${SQL_DIR:-/sql}"

run() {
    psql -v ON_ERROR_STOP=1 -X -q -U "$db_super" -d "$db_name" "$@"
}

# The SQL under /sql hard-codes the "dbo" schema, so the schema name is fixed
# even when the database it lives in is not (test.sh builds into a scratch
# database of its own).
run <<'SQL'
CREATE SCHEMA IF NOT EXISTS "dbo";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SQL

# Order matters: functions are referenced by the triggers, foreign keys need
# both ends of the relationship to exist, and triggers need their tables.
for object_dir in "Functions" "Tables" "ForeignKeys" "Triggers"; do
    for object_file in "$sql_dir/$object_dir"/*.sql; do
        [ -f "$object_file" ] || continue
        run -f "$object_file"
    done
done

run -v db_name="$db_name" -v app_user="$app_user" -f "$sql_dir/Security/Permissions.sql"
