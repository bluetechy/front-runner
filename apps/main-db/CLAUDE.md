# main-db

Postgres schema, seed data and tests. Applies to everything under
`apps/main-db`.

## Changing SQL means changing tests

**Any change to a schema object requires the test suite to be updated in the
same change.** Schema objects are the files under `sql/Functions`, `sql/Tables`,
`sql/ForeignKeys`, `sql/Triggers` and `sql/Security` — the directories
`bin/apply.sh` builds from. `sql/Tests` and `sql/Seeds` sit under `sql/` too but
are not schema objects, so editing them does not trigger this rule.

Not a follow-up, not "later" — the suite is the only thing standing between a
schema edit and a silent runtime failure, and several functions in here shipped
broken for exactly that reason.

| What you changed | What else to touch |
|---|---|
| `sql/Functions/<Name>.sql` | `sql/Tests/Cases/<Name>.sql` — add cases for the new behaviour, update the ones the change invalidates |
| Added a function | the above, plus the list in `TestSchema_ExpectedFunctionsExist` (`sql/Tests/Cases/Schema.sql`) |
| Added a table | the list in `TestSchema_ExpectedTablesExist`, an insert in `sql/Tests/Helpers/InsertOneRowIntoEveryTable.sql`, and its two `ModifiedInfo` triggers in `sql/Triggers/` |
| Added a foreign key | the list in `TestSchema_ExpectedForeignKeysExist` |
| `sql/Triggers/` or a trigger function | `sql/Tests/Cases/<trigger_function>.sql` (`calculate_tallies`, `insert_modified_info`, `update_modified_info`) |
| Added a column | a case proving what it means, and the list in `TestSchema_DraftColumnsExist` if nothing reads it yet |
| Deleted or renamed anything | every `sql/Tests/Cases/` file and `Schema.sql` list that names it |

The structural tests in `sql/Tests/Cases/Schema.sql` hold hardcoded lists of
tables, functions, foreign keys and draft-sourced columns on purpose: adding
something without listing it fails the suite, which is the reminder. Don't
delete an entry to make the suite pass — add the new one.

Run them before saying you're done:

```
make db-test                                  # all of them, ~300ms
make db-test ARGS="--test-name-pattern=Foo"   # a subset
```

The Compose stack has to be up (`make dc3-up-d`). Tests build their own
throwaway `dbo_test`, so they never touch the development database. Schema
edits reach the running container through a bind mount, so there is no rebuild
step — but they do not reach the *application* database until `make db-rebuild`.

## There are no migrations

Schema changes are edits to the files under `sql/`, applied by dropping and
rebuilding: `make db-rebuild`, then `make db-seed`. Don't add a migrations
directory, a version table, or `ALTER` scripts — if a change needs to preserve
existing rows, say so rather than inventing a mechanism.

Seed data (`sql/Seeds/Dev/`) is separate from schema creation and never runs
automatically. Seed rows carry fixed UUIDs and upsert, so keep them
re-runnable.

## Conventions

One object per file, file named exactly for the object. Two deliberate
exceptions: `sql/Tests/Cases/` names the file for the object under test and holds
every `test."Test<Object>_<Behaviour>"` function for it, and `sql/Seeds/Dev/`
leads with an ordering number (`06_UserOrganizations.sql`) because rows have to
load parents before children.

A case file's object can be a table, not just a function: `Cases/UserBadges.sql`
holds what that table's columns *mean* (a NULL `EarnedAt` is a badge in progress),
while facts true of every table — audit columns, triggers, the table list — stay
in `Cases/Schema.sql`. Give a table its own case file when it carries state worth
explaining; don't add one that only restates `Schema.sql`.

`SCHEMA-NOTES.md` has the full naming table, its nuances, and the register of
what the schema still gets wrong. `sql/Tests/README.md` has the assertion helpers
and how a run works. `sql/Seeds/README.md` has how seeding works and the rules
that keep a seed file re-runnable. Read the relevant one before a non-trivial
change rather than inferring the convention from a single file.

### Bash inside the container, JavaScript on the host

`bin/*.sh` and `init.sh` run **inside** the `main-db` container — the Dockerfile
copies them to `/opt/main-db/bin`, Compose bind-mounts them there, and the
Makefile reaches them with `docker compose exec`. That image is `postgres:18.6`:
it has `psql` and a shell and nothing else, so operator scripts are bash and
talk to the database through `psql`.

`test/runner.test.js` runs **on the host** and connects over the published
port. It is JavaScript because it is a workspace member — `npm test` at the
root and `turbo run test` pick it up next to main-api and main-gui — and
because `node --test` is what supplies `--test-name-pattern`, `--watch` and the
JUnit reporter that `make db-test`, `make db-test-watch` and `npm run test:ci`
are built on. A bash suite would mean hand-rolling all three.

So: a new operator script goes in `bin/` as bash; new host-side tooling goes in
the workspace as JavaScript. Don't put host-side tooling in `bin/` — the
Dockerfile copies that whole directory into the image, where node is not
installed.

## Traps that have already caused bugs here

- **Output columns shadow table columns.** A function declared
  `RETURNS TABLE("TeamUUID" uuid, ...)` makes `"TeamUUID"` a plpgsql variable,
  so a bare `WHERE "TeamUUID" = ...` or `ON CONFLICT ("TeamUUID")` raises
  *column reference is ambiguous* on every call. Table-qualify the predicate;
  name the constraint in `ON CONFLICT`.
- **`now()` and `CURRENT_TIMESTAMP` are fixed for the whole transaction.** A row
  inserted and updated inside one test has `UpdatedAt = CreatedAt`. To prove an
  update moves `UpdatedAt` forward, update a *fixture* row.
- **`IsMemberOfTeam` and `IsManagerOfTeam` also require organization
  membership.** They can't confirm that a user with no organization was added to
  a team; read `dbo.UserTeams` directly for that.
- **Adding a fixture row changes counts other tests assert.** `Fixtures.sql` is
  shared by everything; grep for the counts before adding a user or a team.
- **Writing `Status = 'Completed'` moves no points.** Settlement is
  `dbo.SettlePointTransfer` and `dbo.SettlePointRedemption`; they write the
  `dbo.UserPoints` rows that `calculate_tallies` then sums. Updating the status
  column directly leaves the balance untouched and the record lying.
- **Never write `dbo.UserTallies` by hand.** It is derived. Write the ledger row
  — `dbo.AddUserPoints` — and let the trigger do it. The drafts maintained both
  copies by hand, which is how they drifted apart.
- **A ledger total is not a balance.** `dbo.GetPointTotals` counts expired
  rows because it describes what moved; `dbo.GetTallies` drops them because it
  describes what is still good. Reaching for the wrong one gives a number that
  looks plausible and is wrong.
- **An overdue task is not just "not Completed".** `dbo.Tasks."Status"` has two
  terminal values, so overdue is `Status NOT IN ('Completed', 'Cancelled')`.
  The drafts' boolean did not have this problem and the translation looks
  obvious; it isn't. Both the fixtures and the seed carry a task cancelled
  while already past due.
- **`dbo.TaskHistory` and `dbo.AssignmentHistory` are not automatic.** Nothing
  writes them — editing a task logs nothing. The caller writes the row.
- **Nothing runs an approval workflow.** Recording a `dbo.ApprovalDecisions` row
  does not advance the request, no stage order is enforced, and
  `dbo.ApprovalWorkflowPermissions` is advisory — a decision from an
  unpermitted user is accepted. Whatever records one has to check first.
- **`dbo.SurveyAnswers` has two unusual constraints.** Its unique key is
  `NULLS NOT DISTINCT` so a participant gets one free-text answer per question
  but many chosen options, and its option foreign key is composite so an answer
  cannot cite another question's option. Read the table before changing either.
- **A `dbo.UserBadges` row is not proof the badge was earned.** `EarnedAt` is
  NULL while it is in progress and `RevokedAt` is set when it is taken back, so
  anything reading the table has to filter on both the way `GetBadges` does.
  The fixtures carry one row in each state.

## Tests suffixed `_KnownIssue`

These assert behaviour that is **wrong but current**, so the suite stays green
and the defect stays visible. If one fails, the underlying bug was probably
fixed — read the comment above the test and replace it with the positive case.
Never edit one just to get back to green.

Adding a new one is the right move when you find a defect you are not fixing in
this change: write the test, name it `_KnownIssue`, comment what correct looks
like, and add a row to the table in `SCHEMA-NOTES.md`.
