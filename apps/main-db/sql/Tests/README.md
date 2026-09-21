# Database tests

Run them with `make db-test` from the repository root. The Compose stack has to
be up (`make dc3-up-d`); the suite connects over the published Postgres port.

## How a run works

`apps/main-db/test/runner.test.js` drives everything:

1. drops and recreates a scratch database, `dbo_test`
2. builds the schema into it from the same `sql/Functions`, `sql/Tables`,
   `sql/ForeignKeys`, `sql/Triggers` and `sql/Security` that build the
   application database
3. loads `Helpers/`, then `Fixtures/`, then `Cases/`
4. runs every zero-argument `test."Test*"` function inside its own
   transaction and rolls that transaction back
5. drops the scratch database

The application database is never touched, and no test can see another test's
writes. `KEEP_TEST_DB=1 make db-test` leaves `dbo_test` behind to poke at.

The assertions are plpgsql because what they are testing is plpgsql. The Node
file only discovers and drives them, which is what gives you `--watch`,
`--test-name-pattern` and a JUnit reporter for CI.

## Layout

```
Tests/
  Helpers/      assertions and shared setup -- anything not named Test*
  Fixtures/     the world every test starts from, loaded once
  Cases/        one file per object under test, named after that object
```

`Cases/<Object>.sql` holds every test for `dbo.<Object>`, as functions named
`test."Test<Object>_<Behaviour>"`. This is the one place the repository's
one-object-per-file rule bends: the file is named for the object under test,
not for the functions inside it.

When the object is one of the three snake_case trigger functions, the file keeps
that casing and the test functions PascalCase it: `Cases/calculate_tallies.sql`
holds `test."TestCalculateTallies_AddsToAnExistingTally"`. See the naming nuances
in `../../SCHEMA-NOTES.md`.

## Writing a test

```sql
CREATE FUNCTION "test"."TestGetUserUUID_ResolvesAKnownLogin" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"(
        "dbo"."GetUserUUID"('member'),
        "test"."Fixture"('User.Member'),
        'GetUserUUID did not resolve the member login'
    );
END;
$$ LANGUAGE plpgsql;
```

A test that returns passed; a test that raises failed. Available assertions:

| Helper | Use |
|---|---|
| `AssertEquals(actual, expected, message)` | any two comparable values; NULL equals NULL |
| `AssertTrue(actual, message)` | NULL counts as a failure |
| `AssertFalse(actual, message)` | NULL counts as a failure |
| `AssertRowCount(query, expected, message)` | query passed as text, no trailing semicolon |
| `AssertRaises(statement, message, expected_message)` | asserts the statement fails; third argument optional |
| `Fail(message)` | fail outright |

Reference fixture rows by name with `test."Fixture"('User.Member')` rather than
writing UUID literals; an unknown key raises instead of silently returning NULL.
The keys are listed at the top of `Fixtures/Fixtures.sql`.

Two gotchas worth knowing:

- **Probe with the right function.** `IsMemberOfTeam` and `IsManagerOfTeam`
  require organization membership as well as team membership, so they cannot
  confirm that an outsider was added to a team. Read `dbo.UserTeams` directly
  for those cases.
- **`now()` is fixed for the whole transaction.** A row inserted and updated
  inside one test has an `UpdatedAt` identical to its `CreatedAt`. To test that
  an update moves `UpdatedAt` forward, update a *fixture* row -- those were
  written in an earlier transaction.

## Tests named `_KnownIssue`

These assert behaviour that is wrong but current, so the suite stays green and
the defect stays visible. Each one carries a comment explaining what correct
would look like, and a failure message telling you to replace the test rather
than to fix the code. If one starts failing, the bug was probably fixed --
check the comment before touching anything.

See the "Known issues covered by tests" section of `../../SCHEMA-NOTES.md` for
the full list.
