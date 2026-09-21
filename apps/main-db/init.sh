#!/bin/bash
set -e

# Credentials and names come from the environment; the defaults match what the
# SQL under /sql expects so the script still works without an .env file.
db_super="${POSTGRES_USER:-postgres}"
db_name="${APP_DB_NAME:-dbo}"
app_user="${APP_DB_USER:-root}"
app_password="${APP_DB_PASSWORD:-root}"

psql -v ON_ERROR_STOP=1 -U "$db_super" <<SQL
CREATE DATABASE $db_name;
GRANT ALL ON DATABASE $db_name TO $db_super;
CREATE USER $app_user WITH PASSWORD '$app_password';
SQL

psql -v ON_ERROR_STOP=1 -U "$db_super" -d "$db_name" <<SQL
CREATE SCHEMA $db_name;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SQL

# Objects are applied in dependency order: functions, then tables, then the
# constraints and triggers that hang off them, then permissions and seed data.
for db_dir in "Functions" "Tables" "ForeignKeys" "Triggers"; do
    for db_file in "/sql/$db_dir"/*.sql; do
        if [ -f "$db_file" ]; then
            psql -v ON_ERROR_STOP=1 -U "$db_super" -d "$db_name" -f "$db_file"
        fi
    done
done

psql -v ON_ERROR_STOP=1 -U "$db_super" -d "$db_name" -f "/sql/Security/Permissions.sql"
psql -v ON_ERROR_STOP=1 -U "$db_super" -d "$db_name" -f "/sql/Scripts/Seed.sql"
