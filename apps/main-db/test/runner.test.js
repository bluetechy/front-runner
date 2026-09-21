//
// Database test suite.
//
// Builds a throwaway database from the same SQL that builds the application
// database, loads the fixtures into it, then runs every test function in the
// "test" schema inside its own transaction and rolls that transaction back.
// The application database is never touched and no test can see another's
// writes.
//
// The assertions themselves live in sql/Tests -- they are plpgsql, because
// what they are testing is plpgsql. This file only discovers and drives them,
// so that `npm test`, --test-reporter, --test-name-pattern and --watch all
// work the way they do everywhere else in the monorepo.
//
// Connects over the published port, so the Compose stack has to be up:
//
//   make dc3-up-d && npm test --workspace main-db
//
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";

import pg from "pg";

const sqlDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "sql",
);

const superUser = process.env.POSTGRES_USER ?? "postgres";
const superPassword = process.env.POSTGRES_PASSWORD ?? "postgres";
const appUser = process.env.APP_DB_USER ?? "root";
const appDatabase = process.env.APP_DB_NAME ?? "dbo";
const testDatabase = `${appDatabase}_test`;

const connection = {
  host: process.env.PGHOST ?? "localhost",
  port: Number(
    process.env.PGPORT ?? process.env.POSTGRES_PUBLISHED_PORT ?? 30002,
  ),
  user: superUser,
  password: superPassword,
};

// Left behind for inspection when something needs digging into by hand.
const keepTestDatabase = process.env.KEEP_TEST_DB === "1";

const connect = async (database) => {
  const client = new pg.Client({ ...connection, database });
  await client.connect();
  return client;
};

const sqlFilesIn = async (directory) => {
  const entries = await readdir(path.join(sqlDir, directory));
  return entries
    .filter((entry) => entry.endsWith(".sql"))
    .sort()
    .map((entry) => path.join(sqlDir, directory, entry));
};

const applyFile = async (client, file) => {
  try {
    await client.query(await readFile(file, "utf8"));
  } catch (error) {
    error.message = `${path.relative(sqlDir, file)}: ${error.message}`;
    throw error;
  }
};

// The same order bin/apply.sh uses: functions are referenced by the triggers,
// foreign keys need both ends of the relationship, triggers need their tables.
const applySchema = async (client) => {
  await client.query('CREATE SCHEMA IF NOT EXISTS "dbo"');
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  for (const directory of ["Functions", "Tables", "ForeignKeys", "Triggers"]) {
    for (const file of await sqlFilesIn(directory)) {
      await applyFile(client, file);
    }
  }

  // Permissions.sql is written for psql, which substitutes :"name" with a
  // quoted identifier. Do the same here rather than keeping a second copy
  // of the file. The grants only matter if the application role exists --
  // on a cluster that has never run init.sh, it will not.
  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_roles WHERE "rolname" = $1',
    [appUser],
  );
  if (rowCount > 0) {
    const permissions = (
      await readFile(path.join(sqlDir, "Security", "Permissions.sql"), "utf8")
    )
      .replaceAll(':"db_name"', `"${testDatabase}"`)
      .replaceAll(':"app_user"', `"${appUser}"`);
    await client.query(permissions);
  }
};

const applyTests = async (client) => {
  await client.query('CREATE SCHEMA "test"');
  for (const directory of ["Tests/Helpers", "Tests/Fixtures", "Tests/Cases"]) {
    for (const file of await sqlFilesIn(directory)) {
      await applyFile(client, file);
    }
  }
};

// Test functions are the zero-argument functions in the "test" schema whose
// name starts with Test; everything else in there is a helper.
const discoverTests = async (client) => {
  const { rows } = await client.query(`
        SELECT "Procedures"."proname" AS "Name"
        FROM pg_proc AS "Procedures"
            JOIN pg_namespace AS "Namespaces" ON ("Namespaces"."oid" = "Procedures"."pronamespace")
        WHERE "Namespaces"."nspname" = 'test'
            AND "Procedures"."proname" LIKE 'Test%'
            AND "Procedures"."pronargs" = 0
        ORDER BY "Procedures"."proname"
    `);
  return rows.map((row) => row.Name);
};

let maintenance;
let database;
let testNames = [];

// Everything below runs at module load so that the discovered test functions
// can be registered as real subtests rather than hidden inside one big case.
maintenance = await connect(process.env.POSTGRES_DB ?? "postgres");
await maintenance.query(
  `DROP DATABASE IF EXISTS "${testDatabase}" WITH (FORCE)`,
);
await maintenance.query(`CREATE DATABASE "${testDatabase}"`);

database = await connect(testDatabase);
await applySchema(database);
await applyTests(database);
testNames = await discoverTests(database);

describe("main-db", () => {
  it("discovers test functions", () => {
    assert.ok(
      testNames.length > 0,
      "no Test* functions were found in the test schema",
    );
  });

  for (const name of testNames) {
    it(name, async () => {
      await database.query("BEGIN");
      try {
        await database.query(`SELECT "test".${pg.escapeIdentifier(name)}()`);
      } catch (error) {
        // The plpgsql assertion message is the useful part; the stack
        // through node-postgres is not.
        assert.fail(error.message);
      } finally {
        await database.query("ROLLBACK");
      }
    });
  }

  after(async () => {
    await database.end();
    if (!keepTestDatabase) {
      await maintenance.query(
        `DROP DATABASE IF EXISTS "${testDatabase}" WITH (FORCE)`,
      );
    }
    await maintenance.end();
  });
});
