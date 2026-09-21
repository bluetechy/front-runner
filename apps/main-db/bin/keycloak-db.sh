#!/bin/bash
#
# Create the database Keycloak keeps its realm, users and sessions in.
#
# Separate from the application database on purpose: Keycloak owns that schema
# entirely, migrates it on its own schedule, and must never be in reach of
# rebuild.sh -- dropping it would destroy every account in the installation.
#
# Idempotent, and called two ways: by init.sh on a brand new volume, and by
# `make db-keycloak` on a volume that predates Keycloak.
#
set -euo pipefail

db_super="${POSTGRES_USER:-postgres}"
db_maint="${POSTGRES_DB:-postgres}"
kc_db="${KEYCLOAK_DB_NAME:-keycloak}"
kc_user="${KEYCLOAK_DB_USER:-keycloak}"
kc_password="${KEYCLOAK_DB_PASSWORD:-keycloak}"

run() {
    psql -v ON_ERROR_STOP=1 -X -q -U "$db_super" -d "$db_maint" "$@"
}

# The role is cluster-wide, so it survives a dropped database and may already
# be here.
run <<SQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE "rolname" = '$kc_user') THEN
        CREATE ROLE "$kc_user" LOGIN PASSWORD '$kc_password';
    END IF;
END \$\$;
SQL

# CREATE DATABASE cannot run inside the DO block above, and has no IF NOT
# EXISTS. Keycloak owns this database outright, so the role owns it too.
if [ -z "$(run -tAc "SELECT 1 FROM pg_database WHERE \"datname\" = '$kc_db'")" ]; then
    run -c "CREATE DATABASE \"$kc_db\" OWNER \"$kc_user\""
    echo "==> created the $kc_db database"
else
    echo "==> $kc_db already exists"
fi
