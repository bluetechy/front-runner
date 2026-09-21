#!/bin/bash

db_user="postgres"
db_name="dbo"

echo "CREATE DATABASE $db_name; GRANT ALL ON DATABASE $db_name TO $db_user" | psql -U "$db_user"
echo "CREATE SCHEMA $db_name;" | psql -U "$db_user" -d "$db_name"
echo "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" | psql -U "$db_user" -d "$db_name"
echo "CREATE USER root WITH PASSWORD 'root';" | psql -U "$db_user" -d "$db_name"

for db_file in "/sql/Functions"/*.sql; do
    if [ -f "$db_file" ]; then
        psql -U "$db_user" -d "$db_name" -f "$db_file"
    fi
done
for db_file in "/sql/Tables"/*.sql; do
    if [ -f "$db_file" ]; then
        psql -U "$db_user" -d "$db_name" -f "$db_file"
    fi
done
psql -U "$db_user" -d "$db_name" -f "/sql/Permissions.sql"
psql -U "$db_user" -d "$db_name" -f "/sql/Data.sql"
