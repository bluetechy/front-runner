# main-db schema notes

## Folder layout

SQL Server / SSDT style — one object per file, file name identical to the object name.

```
bin/
  apply.sh          build the schema into a named database
  rebuild.sh        drop the application database and build it again
  seed.sh           load a seed dataset on demand
test/
  runner.test.js    discovers and drives the SQL tests
sql/
  Functions/        one function per file            (22)
  Tables/           CREATE TABLE only, no triggers   (25)
  Triggers/         one trigger per file             (52)
  ForeignKeys/      FK constraints, one file per table (12 files, 27 constraints)
  Security/         Permissions.sql
  Seeds/Dev/        demo data, applied on demand     (14)
                    see Seeds/README.md
  Tests/            see Tests/README.md
    Helpers/        assertions and shared setup       (8)
    Fixtures/       the world every test starts from  (1)
    Cases/          one file per object under test    (29)
  Drafts/           not built; see "Drafts" below
    Tables/                                          (45)
    Functions/                                       (72)
    StoredProcedures/                                (97)
```

`bin/apply.sh` applies `Functions -> Tables -> ForeignKeys -> Triggers -> Security`.
`init.sh` creates the database and role on first container start and then calls it.
Nothing under `Drafts/`, `Seeds/` or `Tests/` is applied by either.

**Schema creation and seeding are separate.** A fresh database is empty. Demo
data is `make db-seed`; the tests build their own scratch database and load
their own fixtures. See the "Database" section of the repository README.

## Naming convention

| Thing | Convention | Example |
|---|---|---|
| Schema | `dbo`, always quoted | `"dbo"."Users"` |
| Table | PascalCase, plural | `UserOrganizations` |
| Column | PascalCase, quoted | `"CreatedBy"` |
| Primary key | `<SingularTable>UUID` | `"OrganizationUUID"` |
| Audit columns | on every table | `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy` |
| Business function | PascalCase verb phrase | `"dbo"."GetOrganizations"` |
| Trigger function | snake_case | `"dbo"."update_modified_info"` |
| Function parameter | `_PascalCase` | `_OrganizationUUID` |
| Trigger | `<Table>_<Purpose>_<Event>` | `Users_ModifiedInfo_Insert` |
| Unique constraint | `<Table>_<What>_UniqueKey` | `Users_LoginName_UniqueKey` |
| Foreign key | `FK_<Table>_<ReferencedTable>` | `FK_UserBadges_Badges` |
| Foreign key, 2nd to same table | `FK_<Table>_<ReferencedTable>_<Column>` | `FK_SharedBadges_Users_SharedWithUserUUID` |
| File name | exactly the object name + `.sql` | `Triggers/Users_ModifiedInfo_Insert.sql` |
| Test function | `test."Test<Object>_<Behaviour>"` | `test."TestGetUser_ReturnsTheMatchingUser"` |
| Test helper | PascalCase verb phrase in the `test` schema | `test."AssertRowCount"` |
| Seed file | `<NN>_<Table>.sql`, numbered in dependency order | `Seeds/Dev/06_UserOrganizations.sql` |

### Nuances

Everything below is deliberate. It is written down because each one looks like a
slip when you meet it in a single file.

**Two casings for functions.** PascalCase is the API the application calls.
snake_case is internal trigger plumbing, and there are exactly three:
`calculate_tallies`, `insert_modified_info`, `update_modified_info`. The test for
"is this ours to call?" is the return type — every snake_case function here is
`RETURNS TRIGGER` and is reached only through `EXECUTE PROCEDURE` in `sql/Triggers/`.
Each of the three carries a comment saying so on line 1.

**So three files sort to the bottom of `Functions/`.** File names copy the object
name exactly, casing included, and file trees sort uppercase before lowercase. The
three trigger functions landing under `LoginUser.sql` is that, not a stray folder.

**Trigger function bodies mix both casings.** `update_modified_info` is snake_case
but assigns to `NEW."UpdatedAt"`. Columns are PascalCase everywhere in the schema
and a trigger function does not get its own copy of them, so the mix is forced.

**Test function names PascalCase the object, test file names do not.** The tests
for `calculate_tallies` live in `Tests/Cases/calculate_tallies.sql` — file named
for the object, casing preserved — as functions named
`test."TestCalculateTallies_SumsOnlyUnexpiredRows"`. `Test<Object>_` reads badly
with an underscore already in `<Object>`, so the object gets PascalCased inside the
function name only.

**Seed files carry an ordering prefix.** `Seeds/Dev/` is the one place a file name
is not exactly an object name: rows have to load parents before children, so the
number leads (`09_UserPoints.sql`). Seeds are data, not schema objects.

**Every identifier is quoted, which makes it case-sensitive.** `"dbo"."Users"` is a
different table from `dbo.users`. Unquoted identifiers fold to lowercase in Postgres,
so an unquoted reference to any live object is a bug, not a style choice. `sql/Drafts/`
is still unquoted — see below.

**Parameters lead with an underscore.** `_OrganizationUUID`, not `OrganizationUUID`,
so a parameter can never collide with the PascalCase column of the same name. The
related trap that this does *not* solve — `RETURNS TABLE` output columns shadowing
table columns — is in `CLAUDE.md`.

`PointTransfers` bends the "2nd to same table" rule: it has two foreign keys to
`Users` and *both* carry the column suffix. The rule leaves the first one
unsuffixed on the assumption that it is the plain `"UserUUID"`, and neither
`"SenderUserUUID"` nor `"ReceiverUserUUID"` is — an unsuffixed
`FK_PointTransfers_Users` would not say which end it constrained.

`sql/Drafts/` was converted to the same convention: every table, column, function,
procedure and parameter is now PascalCase, and each file is named after its object.
**Types and structure were not touched** — draft keys stay `serial` integers named
`<Singular>Id` (`TaskId`, `UserId`), not `<Singular>UUID`, because they really are
integers. Renaming them to `*UUID` is part of migrating a draft into the live schema,
not part of this pass. Draft tables are also still unquoted and unschema'd, so
Postgres folds them to lowercase — quote them and prefix `dbo.` on migration.

## Changes made during the reorg

These alter behaviour. Revert any you disagree with.

1. `Tables/Organziations.sql` -> `Tables/Organizations.sql` (file name was misspelled;
   the table inside was always spelled correctly).
2. Inline `REFERENCES` moved out of `Tables/*.sql` into `ForeignKeys/*.sql` and
   schema-qualified. They were unqualified (`REFERENCES Users("UserUUID")`), so they
   resolved against `search_path` — which does not contain `dbo` — and every table
   carrying one failed to create. Moving them after `Tables/` also removes the
   alphabetical ordering trap (`BadgeAchievements` referenced `Users` and `Badges`,
   both of which load later).
3. `ForeignKeys/UserBadges.sql` gave all three constraints the literal name
   `constraint_name`; the 2nd and 3rd would have failed as duplicates. Renamed per
   the convention above.
4. `SharedBadges."UserUUID"` and `"SharedWithUserUUID"` were `INT` referencing
   `Users("UserUUID")` (uuid), and `BadgeEventCriteria."BadgeEventUUID"` was `INT`
   referencing `BadgeEvents("BadgeEventUUID")` (uuid). Changed to `uuid` so the FKs
   are creatable. No columns removed.
5. `SharedBadges` had `ModifiedInfo` triggers but none of the four audit columns they
   write, so every insert would have failed. Added `CreatedAt`/`CreatedBy`/
   `UpdatedAt`/`UpdatedBy` to match every other table.
6. `UserPoints."CreatedBy"` was `varchar(20)` where every other table uses
   `varchar(64)`. Widened.
7. `calculate_tallies()` moved from `Tables/UserPoints.sql` to
   `Functions/calculate_tallies.sql`, schema-qualified, and **given a WHERE clause**.
   Its `UPDATE "dbo"."UserTallies" SET "Amount" = (...)` had no WHERE, so a single
   insert into `UserPoints` overwrote every tally row in the table with that one
   user's balance.
8. `LeaveOrganization`: `DELETE FROM "dbo"."UserOrganizations" WHERE ... AND
   "UserTeams"."UserUUID" = _UserUUID` — filtered on a table not in the statement.
   Changed to `"UserOrganizations"."UserUUID"`.
9. `JoinOrganization`: returned `_IsOwner`, a variable that was never declared.
   Replaced with a subquery against `UserOrganizations`.
10. `init.sh`: added `set -e` and `-v ON_ERROR_STOP=1`. Every failure above was
    silent because psql exited 0 on error and the loop ignored it.

## Changes made while adding seeding and tests

11. **`JoinOrganization` and `JoinTeam` could never run.** Both declare
    `RETURNS TABLE(... "OrganizationUUID" ... )` / `... "TeamUUID" ...`, which
    makes those names plpgsql variables, and both then used the same names as
    bare column references — `ON CONFLICT ("UserUUID", "OrganizationUUID")`,
    and in `JoinTeam` also `WHERE "UserUUID" = _UserUUID AND "TeamUUID" =
    _TeamUUID`. Every call raised `column reference "..." is ambiguous`. The
    `ON CONFLICT` inference lists became `ON CONFLICT ON CONSTRAINT
    "UserOrganizations_UUIDs_UniqueKey"` / `"UserTeams_UUIDs_UniqueKey"`, and
    the `UPDATE` predicate is now table-qualified. Behaviour is otherwise
    unchanged. Found by the test suite.
12. `Security/Permissions.sql` took its database name and application user from
    psql variables instead of hard-coding `dbo` and `root`, and lost its
    `\connect`, so it can be applied to the scratch test database too.
13. `apply.sh` always creates the schema `dbo`, where `init.sh` previously
    created a schema named after `APP_DB_NAME`. Every object under `sql/` is
    written `"dbo"."Thing"`, so the schema name was never actually variable —
    changing `APP_DB_NAME` used to produce a database nothing could be built
    into.
14. `sql/Scripts/Seed.sql` was deleted. Its content lives on, expanded, in
    `sql/Seeds/Dev/`.

## Still broken — not touched, your call

- **`ForeignKeys/` was never run.** `init.sh` only looped over `Functions/` and
  `Tables/`. The folder existed but nothing applied it. Now wired in, which means
  these constraints take effect for the first time — expect the seed to surface any
  referential problems that were previously invisible.
- **No FKs at all** on `Teams`, `UserTeams`, `UserOrganizations`, `UserPoints`,
  `UserTallies`, `BadgeCategories.ParentBadgeCategoryUUID`, `Badges.BadgeCategoryUUID`,
  `Badges.OwnerUUID`. Their `*UUID` columns are plain `uuid NOT NULL`.
- **`Badges_Level_UniqueKey` is `UNIQUE ("BadgeUUID", "Level")`** where `BadgeUUID`
  is already the primary key, so the constraint can never reject anything. If the
  intent was one row per badge level, `Badges` needs a separate surrogate key.
- **`UserTallies` has no `CreatedAt`/`CreatedBy`**, so its `..._ModifiedInfo_Insert`
  trigger calls `update_modified_info` rather than `insert_modified_info`. That works,
  but the trigger name is misleading.
- **`GetUsers` authorises with `_LoginName = 'admin'`** — a hardcoded string — rather
  than checking `Users."IsAdmin"`. Anyone who registers the login `admin` gets the
  full user list.
- **`LoginUser` upserts on every call.** `INSERT ... ON CONFLICT DO NOTHING RETURNING
  "UserUUID" INTO _UserUUID` then discards `_UserUUID`. Any unknown login silently
  creates an enabled account.
- **`JoinTeam` takes no authorisation check**, unlike `JoinOrganization` which requires
  `IsOwnerOfOrganization`. Any caller can add any user to any team, and the following
  `UPDATE` lets them set `IsManager`.
- **`LeaveTeam` takes no authorisation check** either, unlike `LeaveOrganization`.
- **`GetTeams` returns one row per team *membership*, not per team.** It joins
  `UserTeams` without filtering or de-duplicating, so a team with three members
  comes back three times. The `IsManager` column is already computed by a
  correlated subquery, so the join earns nothing — a `DISTINCT`, or dropping the
  join, fixes it. Found while writing the tests.
- **`JoinTeam` does not require organization membership.** It will happily put a
  user on a team in an organization they do not belong to, and every read
  function then ignores the row: `IsMemberOfTeam` and `IsManagerOfTeam` both
  test organization membership too, so the membership exists but is invisible.
  Either `JoinTeam` should reject it or it should add the organization
  membership as well. Found while writing the tests.

Each of these has a `_KnownIssue` test locking in the current behaviour — see
below.

## Known issues covered by tests

These tests assert behaviour that is **wrong but current**, so that the suite
stays green and the defect stays visible and documented. Every one carries a
comment describing what correct would look like, and a failure message telling
you to replace the test rather than to fix the code.

| Test | Issue |
|---|---|
| `TestGetUsers_IgnoresIsAdmin_KnownIssue` | `GetUsers` authorises on the literal login `'admin'`, not on `Users."IsAdmin"` |
| `TestLoginUser_CreatesAnAccountForAnUnknownLogin_KnownIssue` | `LoginUser` silently creates an enabled account for any unknown login, with no credential check |
| `TestGetTeams_DuplicatesTeamsPerMember_KnownIssue` | `GetTeams` emits one row per membership rather than per team |
| `TestJoinTeam_AllowsAnyCaller_KnownIssue` | `JoinTeam` performs no authorisation check |
| `TestJoinTeam_CreatesUnreachableMembershipsForOutsiders_KnownIssue` | `JoinTeam` creates team memberships the read functions cannot see |
| `TestLeaveTeam_AllowsAnyCaller_KnownIssue` | `LeaveTeam` performs no authorisation check |
| `TestUpdateModifiedInfo_LeavesUpdatedByToTheCaller` | `update_modified_info` maintains `UpdatedAt` but not `UpdatedBy`; a caller who forgets it leaves the previous author's name on the row |

If one of these starts failing, the underlying bug was probably fixed — read the
comment above the test before changing anything.

`TestSchema_EveryTableHasAuditColumns` carries the one structural exemption:
`UserTallies` is allowed to lack `CreatedAt`/`CreatedBy`. Every other table is
required to have all four, so a new table without them fails the suite.

## Drafts

`sql/Drafts/` is the decomposed content of the former `Tables-ChatGPT.sql` and
`Functions-ChatGPT.sql`. Nothing in it is applied by `init.sh` and nothing was
deleted for referencing a missing table — those are flagged with a
`-- MISSING REFS:` header in the file instead.

It is **the same product, drafted earlier** — organizations, teams, badges, points,
and the workflow features built on top of them. It is not a second application's
schema. What differs is convention, not domain: `serial` integer keys instead of
uuid, no audit columns, no `OrganizationUUID` anywhere, unquoted and unschema'd
identifiers, and references to a `Users(UserId)` table that this repo does not have
(the live one is `"dbo"."Users"."UserUUID"`). So the two do not *interoperate* as
written, but the drafts are the design this schema grew out of and the backlog it
has not caught up with yet — read them as a feature inventory, not as dead code.

**Overlaps with the live schema** — flagged with `-- OVERLAP:` in each file:

| Draft | Live equivalent |
|---|---|
| `Badges`, `BadgeAchievements`, `BadgeCriteria`, `BadgeCategories`, `BadgeEvents`, `BadgeEventCriteria`, `BadgeGroups`, `BadgeGroupRelationships`, `BadgeReviews`, `BadgeStatistics`, `SharedBadges` | the matching `dbo.Badge*` tables |
| `UserBadges` | `dbo.UserBadges` — columns folded in, see below |
| `PointTypes` | `dbo.Points` |
| `PointTransactions` | `dbo.UserPoints` |
| `PointUsageLogs` | `dbo.UserPoints` |
| `UserPointTotals` | `dbo.UserTallies` |

The 11 badge tables were commented out in the original file, which lines up exactly
with the live `dbo.Badge*` tables — they look migrated already. They are kept as
drafts rather than deleted.

### Columns folded in from the drafts

Ten draft columns are now live. The names follow the live convention rather than
the draft's, which strips the prefix that repeats the table name
(`TransactionDetails` -> `"Details"` on `UserPoints`); `"EarnedDescription"` keeps
its qualifier because a bare `"Description"` on `UserBadges` reads as the badge's.

| Table | Columns | From |
|---|---|---|
| `dbo.UserBadges` | `EarnedAt`, `EarnedDescription`, `ProgressGoal`, `ProgressCurrent`, `RevokedAt` | `Drafts/Tables/UserBadges.sql` |
| `dbo.UserPoints` | `Reason`, `Details` | `PointTransactions.TransactionReason`, `.TransactionDetails` |
| `dbo.Points` | `ExpirationDuration`, `ResetCondition` | `PointTypes` |
| `dbo.UserTallies` | `DailyLimit`, `SpendLimit` | `UserPointTotals` |

Three things about them are not obvious:

**A `UserBadges` row no longer means "earned".** `EarnedAt` is NULL while the badge
is in progress and `RevokedAt` is set when one is taken back, so `GetBadges` now
filters on both — otherwise adding the columns would have quietly started reporting
unearned badges as held. `GetBadges` also returns `EarnedAt` and `EarnedDescription`
now; main-api selects `*` from it, so both reach the API response.

**Nothing reads the other nine yet.** `ExpirationDuration` and `ResetCondition` are
policy that no function enforces — expiry is still per-row on
`UserPoints."ExpiresAt"`. Same for the two limits and for `Reason`/`Details`.
`TestSchema_DraftColumnsExist` is what holds them in place until a reader exists;
it is a hardcoded list for the same reason the other structural lists are.

**The two limits are policy on a derived table.** `UserTallies` is otherwise
maintained entirely by `calculate_tallies`, which rewrites `"Amount"` on every point
row. It upserts with `DO NOTHING` and its `UPDATE` names only `"Amount"` and
`"UpdatedBy"`, so a limit set on a tally survives — `TestCalculateTallies_PreservesTheLimitsOnATally`
locks that in. If `calculate_tallies` ever grows into a full upsert, the limits are
what it will silently clear.

**Follow-up:** the progress columns are write-only from the application's side.
`Drafts/Functions/GetBadgeProgress.sql` and `GetUserBadgeProgressSummary.sql` are the
readers they were drafted for; neither is migrated. `Tests/Cases/UserBadges.sql`
reaches into the table directly in the meantime.

### Tables migrated from the drafts

Five of the points tables are live, uuid-keyed, org-scoped and audited:
`PointLevels`, `UserPointLevels`, `PointMultipliers`, `PointRedemptions`,
`PointTransfers`. The draft versions stay where they are.

Which half of a pair gets `OrganizationUUID` follows what was already here:
definition tables are global (`Points`, `Badges`, and now `PointLevels` and
`PointMultipliers`), per-user tables are scoped (`UserPoints`, `UserBadges`, and
now `UserPointLevels`, `PointRedemptions`, `PointTransfers`). `UserPointLevels`
drops the draft's `PointTypeId`: the level it names already carries the point
type, so repeating it would let the two disagree.

**`PointUsageLogs` was deliberately not migrated.** It is a second ledger with
the same shape as `PointTransactions` — user, signed amount, reason, JSON
details, timestamp — and `dbo.UserPoints` is already that table, with `Reason`
and `Details` folded in above. Creating it would have given the schema two
ledgers and no rule for which one a balance comes from. The drafts read
`PointUsageLogs` in 20 files and `PointTransactions` in 3; both should be read
as `dbo.UserPoints` when those functions are migrated.

**None of the five moves a balance.** `PointRedemptions` and `PointTransfers`
are records of intent and approval — a row marked `Completed` has still not
changed anyone's tally, because `calculate_tallies` sums `dbo.UserPoints` and
nothing else. Settling a redemption means writing a negative `UserPoints` row;
settling a transfer means writing the matching pair. Neither is implemented, and
the tests in `Tests/Cases/PointRedemptions.sql` and `PointTransfers.sql` pin the
current behaviour so the gap is visible rather than assumed closed.
`PointMultipliers` is the same kind of gap: the factor is stored, and whatever
awards points has to apply it before the amount is written.

`UserPointLevels` is history, not a derived view. A level reached stays reached
when the balance falls back — `Seeds/Dev/12_UserPointLevels.sql` carries one row
in exactly that state on purpose, and a reader that rebuilds levels from the
current tally would wrongly drop it.

### Duplicates resolved

- `ReversePointTransaction` was **defined twice** (lines 602 and 1161 of the old
  file). The second was an empty stub and, sharing a name, would have silently
  replaced the first at load time. Kept the implemented body.
- `GetPointsLeaderboard` and `GetPointLeaderboard` were the same function under two
  names. Merged into `GetPointLeaderboard`, keeping the `LEFT JOIN`/`COALESCE` shape
  but reading `UserPointTotals.Points` — the other version selected `upt.TotalPoints`,
  a column that table does not have.

Those two are the only objects removed. Nothing else was dropped, including tables
that reference a table which does not exist.

### Near-duplicates left alone — pick one when you migrate

Each pair is one implemented version plus one empty stub with the same job:

| Implemented | Stub covering the same ground |
|---|---|
| `TransferPoints` | `TransferPointsToUser` |
| `RedeemPointsForReward` | `ClaimRewardWithPoints` |
| `ApplyPointMultiplier` | `ActivatePointMultiplier` |
| `AddPointsToUser` | `AdjustUserPoints` |
| `RevokeBadgeFromUser` (takes a `Reason`) | `RemoveUserBadge` (identical DELETE, no reason) |

Three empty stubs all describe automatic badge assignment: `AssignBadgesAutomatically`,
`AutoAwardBadges`, `AssignBadgesBasedOnActivity`.

Four functions read `PointUsageLogs` with the same projection and differ only in their
WHERE clause — they collapse into one function with optional filters:
`GetUserPointTransactions` (no filter), `GetPointActivityHistory` (adds LIMIT),
`GetPointEarningsHistory` (`PointsChange > 0`), `GetPointTransactionsByType`
(`TransactionReason = $2`).

### Drafts do not currently compile

Independent of the missing `users` table, these will not load as written:

- **Shadowed parameters.** Dozens of bodies read `WHERE UserId = UserId`, where both
  sides resolve to the parameter — always true. Same for `Status = Status`,
  `RequestId = RequestId`, `StageId = StageId`. Affects most of
  `Drafts/Functions/GetApproval*.sql` and many procedures. The rename does not fix
  this; the parameter needs a distinct name (`_UserId`) or the column needs qualifying.
- **`DECLARE` after `BEGIN`.** `RedeemPoints`, `ApplyPointMultiplier`,
  `ReversePointTransaction`, `RedeemPointsForReward` all put `DECLARE` inside the
  executable block. plpgsql requires it before `BEGIN`.
- **`Limit` as a parameter name** in `GetPointLeaderboard`, `GetRecentlyEarnedBadges`,
  `GetPointTransferHistory` and others. Still broken after the rename: Postgres folds
  unquoted identifiers to lowercase, so `Limit` is the reserved word `limit` and
  `LIMIT Limit` will not parse. Needs a real rename, e.g. `RowLimit`.
- **`SELECT MultiplierFactor INTO MultiplierFactor`** in `ApplyPointMultiplier`
  assigns a variable from itself.
- `Tasks` references `TaskDependencies`, which is declared after it, and
  `TaskDependencies` references `Tasks` back — circular, so one direction has to
  become an `ALTER TABLE`.
