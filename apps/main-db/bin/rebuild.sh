#!/bin/bash
#
# Drop the application database and build it again from /sql.
#
# This is the "no migrations" workflow: edit the SQL, rebuild, reseed. It
# takes a couple of seconds and it throws away every row in the database, so
# it is a development tool and nothing else.
#
# The application role is cluster-wide and survives, so this does not need to
# recreate it.
#
set -euo pipefail

db_super="${POSTGRES_USER:-postgres}"
db_name="${APP_DB_NAME:-dbo}"
db_maint="${POSTGRES_DB:-postgres}"

echo "==> dropping and recreating $db_name"
psql -v ON_ERROR_STOP=1 -X -q -U "$db_super" -d "$db_maint" <<SQL
DROP DATABASE IF EXISTS "$db_name" WITH (FORCE);
CREATE DATABASE "$db_name";
GRANT ALL ON DATABASE "$db_name" TO "$db_super";
SQL

echo "==> applying schema"
"$(dirname "$0")/apply.sh" "$db_name"

echo "==> done -- the database is empty; run 'make db-seed' for demo data"
