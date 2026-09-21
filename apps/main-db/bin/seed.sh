#!/bin/bash
#
# Load demo data into the application database, on demand.
#
# Usage: seed.sh [--reset] [dataset]
#
#   --reset   empty every dbo table first, so the result is exactly the
#             dataset and nothing else
#   dataset   a directory name under /sql/Seeds (default: Dev)
#
# Seed files are idempotent — every row carries a fixed UUID and upserts — so
# running this twice is the same as running it once, and editing a seed file
# and re-running refreshes the rows it touches.
#
set -euo pipefail

reset="no"
if [ "${1:-}" = "--reset" ]; then
    reset="yes"
    shift
fi

dataset="${1:-Dev}"
db_super="${POSTGRES_USER:-postgres}"
db_name="${APP_DB_NAME:-dbo}"
sql_dir="${SQL_DIR:-/sql}"
seed_dir="$sql_dir/Seeds/$dataset"

if [ ! -d "$seed_dir" ]; then
    echo "seed.sh: no such dataset: $dataset (looked in $sql_dir/Seeds)" >&2
    exit 1
fi

run() {
    psql -v ON_ERROR_STOP=1 -X -q -U "$db_super" -d "$db_name" "$@"
}

if [ "$reset" = "yes" ]; then
    echo "==> emptying $db_name"
    # One TRUNCATE for every table at once: they reference each other, so
    # emptying them one at a time would trip the foreign keys.
    run <<'SQL'
DO $$
DECLARE
    _Tables text;
BEGIN
    SELECT string_agg(format('%I.%I', "schemaname", "tablename"), ', ')
    INTO _Tables
    FROM pg_tables
    WHERE "schemaname" = 'dbo';

    IF _Tables IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || _Tables || ' RESTART IDENTITY CASCADE';
    END IF;
END $$;
SQL
fi

echo "==> seeding $db_name from Seeds/$dataset"
for seed_file in "$seed_dir"/*.sql; do
    [ -f "$seed_file" ] || continue
    echo "    $(basename "$seed_file")"
    run -f "$seed_file"
done

echo "==> done"
