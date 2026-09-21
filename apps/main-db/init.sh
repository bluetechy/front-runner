#!/bin/bash
#
# Runs once, the first time the container starts on an empty data directory.
#
# It creates the application database and role and builds the schema into it.
# It deliberately does not seed: an empty schema is the starting point, and
# demo data is applied on demand with `make db-seed`.
#
set -e

db_super="${POSTGRES_USER:-postgres}"
db_name="${APP_DB_NAME:-dbo}"
app_user="${APP_DB_USER:-root}"
app_password="${APP_DB_PASSWORD:-root}"

psql -v ON_ERROR_STOP=1 -U "$db_super" <<SQL
CREATE DATABASE $db_name;
GRANT ALL ON DATABASE $db_name TO $db_super;
CREATE USER $app_user WITH PASSWORD '$app_password';
SQL

/opt/main-db/bin/apply.sh "$db_name"
