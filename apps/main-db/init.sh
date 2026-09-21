#!/bin/bash
set -e

db_user="postgres"
db_name="dbo"

echo "CREATE DATABASE $db_name; GRANT ALL ON DATABASE $db_name TO $db_user" | psql -U "$db_user"
echo "CREATE SCHEMA $db_name;" | psql -U "$db_user" -d "$db_name"
echo "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" | psql -U "$db_user" -d "$db_name"
echo "CREATE USER root WITH PASSWORD 'root';" | psql -U "$db_user" -d "$db_name"

# Objects are applied in dependency order: functions, then tables, then the
# constraints and triggers that hang off them, then permissions and seed data.
for db_dir in "Functions" "Tables" "ForeignKeys" "Triggers"; do
    for db_file in "/sql/$db_dir"/*.sql; do
        if [ -f "$db_file" ]; then
            psql -v ON_ERROR_STOP=1 -U "$db_user" -d "$db_name" -f "$db_file"
        fi
    done
done

psql -v ON_ERROR_STOP=1 -U "$db_user" -d "$db_name" -f "/sql/Security/Permissions.sql"
psql -v ON_ERROR_STOP=1 -U "$db_user" -d "$db_name" -f "/sql/Scripts/Seed.sql"
