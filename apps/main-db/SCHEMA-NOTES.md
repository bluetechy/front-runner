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
  Functions/        one function per file            (43)
  Tables/           CREATE TABLE only, no triggers   (51)
  Triggers/         one trigger per file            (104)
  ForeignKeys/      FK constraints, one file per table (39 files, 83 constraints)
  Security/         Permissions.sql
  Seeds/Dev/        demo data, applied on demand     (44)
                    see Seeds/README.md
  Tests/            see Tests/README.md
    Helpers/        assertions and shared setup       (8)
    Fixtures/       the world every test starts from  (1)
    Cases/          one file per object under test    (60)
  Drafts/           not built; see "Drafts" below
    Functions/        real logic, to rewrite          (2)
    StoredProcedures/ real logic, to rewrite          (2)
    Unbuilt.sql       118 signatures, nothing written
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
| Check constraint | `<Table>_<What>_Check` | `ApprovalRequests_OneSubject_Check` |
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
three trigger functions landing under `SettlePointTransfer.sql` is that, not a
stray folder.

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
   Replaced with a subquery against `UserOrganizations`. (The function itself is
   gone now — see "Organization membership is by invitation" above.)
10. `init.sh`: added `set -e` and `-v ON_ERROR_STOP=1`. Every failure above was
    silent because psql exited 0 on error and the loop ignored it.

## Changes made while adding seeding and tests

11. **`JoinOrganization` and `JoinTeam` could never run.** (`JoinOrganization`
    has since been replaced by the invitation functions; the trap it fell into
    is the reason every new one names its constraint in `ON CONFLICT`.) Both declare
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
- **`JoinTeam` takes no authorisation check**, unlike `InviteToOrganization` which
  requires `IsOwnerOfOrganization`. Any caller can add any user to any team, and the
  following `UPDATE` lets them set `IsManager`. Teams are still the old model: the
  organization side went to invitations and consent, and the team side did not.
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

## Identity lives in Keycloak

`dbo.Users` is a projection of an account Keycloak owns, not the account itself.
There are no passwords, no credentials and no sign-in in this schema, and
`dbo.ProvisionUser` — which replaced `LoginUser` — checks nothing: by the time
it is called, `main-api` has already verified the token's signature against the
realm's public keys. It maps a verified identity onto a row and nothing more.

`Users."SubjectId"` is the Keycloak `sub` claim and is the identity. It is
immutable; `LoginName`, `Name` and `Email` are copies of claims the user can
edit, refreshed on sign-in. Two consequences worth knowing before building on
this:

- **A NULL `SubjectId` is claimable by login name.** That is how the seeded rows
  — written before Keycloak existed — survive the move: the first sign-in with a
  matching username takes the row over. It is safe only while Keycloak is the
  sole source of login names. A second identity provider issuing the same
  username would land on the same row, so adding one means removing this path
  and migrating the remaining NULLs first.
- **`LoginName` is still the actor handle everywhere else.** Every other
  function takes `_LoginName`, so a rename in Keycloak changes the value those
  calls are made with. Nothing stores it as a foreign key — the `*UUID` columns
  do that — so a rename is safe, but audit columns (`CreatedBy`, `UpdatedBy`)
  keep whatever name was current when the row was written.

## Organization membership is by invitation

An account exists on its own and belongs to nothing. `dbo.JoinOrganization` —
which let an owner put any user into their organization without asking — is
gone, replaced by `dbo.OrganizationInvitations` and five functions around it:
an owner invites an address, and the account holding that address accepts or
declines. This is the GitHub and Cloudflare model, and the reason the table is
keyed on an email rather than a `UserUUID` is that an invitation can precede the
account.

`dbo.LeaveOrganization` still does both removals — leaving, and being removed by
an owner — but now refuses to remove the last enabled owner. An organization
without one has nobody who can invite, create teams or hand ownership on, and
there is no route back into it.

An organization is administered through four functions that did not exist
before: `dbo.GetOrganizationMembers` (any member may read it — knowing who else
is in the room is not a privilege, unlike `dbo.GetOrganizationInvitations`),
`dbo.SetOrganizationRole`, `dbo.RenameOrganization` and
`dbo.SetOrganizationEnabled`.

`dbo.SetOrganizationRole` is what makes the last-owner guard survivable.
Ownership could otherwise only be granted by an invitation offering it up front,
so handing over to somebody already inside would mean removing them and
re-inviting — while `dbo.LeaveOrganization` refused to let the last owner go in
the meantime. Promote the successor, then step down. It refuses to demote the
last owner for the same reason leaving refuses to remove them, and both now
share `dbo.IsLastOwnerOfOrganization` rather than carrying a copy of the rule.

**Two functions deliberately bypass the `Is*OfOrganization` helpers.**
`dbo.GetOrganization` and `dbo.SetOrganizationEnabled` read `dbo.UserOrganizations`
directly, because those helpers also require the organization to be *enabled* —
and an owner restoring an organization they archived is exactly the case that
has to work. A check that dies with the thing it checks is a door that locks
from the inside. `dbo.GetOrganizations` grew an `_IncludeDisabled` parameter for
the same reason: without it there is no way to find an archived organization to
restore.

Two rough edges this deliberately leaves:

- **Nothing sweeps expired invitations.** A lapsed row stays `Pending` forever
  and `ExpiresAt` is what makes it unusable, so every reader has to test both.
  `TestOrganizationInvitations_LapseWithoutChangingStatus` pins that.
- **Nothing sends the invitation anywhere.** There is no mail, so an invitee
  finds out by calling `dbo.GetUserInvitations`. Delivery needs its own design.

## Known issues covered by tests

These tests assert behaviour that is **wrong but current**, so that the suite
stays green and the defect stays visible and documented. Every one carries a
comment describing what correct would look like, and a failure message telling
you to replace the test rather than to fix the code.

| Test | Issue |
|---|---|
| `TestGetUsers_IgnoresIsAdmin_KnownIssue` | `GetUsers` authorises on the literal login `'admin'`, not on `Users."IsAdmin"` |
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

`sql/Drafts/` is what is left of the former `Tables-ChatGPT.sql` and
`Functions-ChatGPT.sql`. Nothing in it is applied by `init.sh`.

**`Drafts/Tables/` is empty and gone — every draft table has been migrated.**
What is left is logic.

**The folder is being merged into the live schema and is meant to reach zero.**
It is a backlog, not an archive: migrating something deletes its draft. That
rule arrived late — the first four migrations documented what they superseded
and left the files sitting there, so `Drafts/Tables/` reached 87% dead weight
before anyone noticed. The register below is what those mappings became; git
history is where the deleted originals live.

What is left, and what finishing it means:

| | Count | What "merged" looks like |
|---|---|---|
| `Functions/` + `StoredProcedures/` | 2 | rewritten as `sql/Functions/*.sql`: uuid keys, quoted identifiers, `_Parameter` names, and the organization-membership check every live read function carries. Not a translation — the drafts have no authorization at all |
| `Unbuilt.sql` | 118 signatures | nothing to migrate. These are operations nobody ever wrote, so they empty out as features get built, not as part of this merge |

The two are `GetApprovalStepsForUser` and `MergeUserAccounts`. They are the only
files left whose content cannot be reconstructed from the live schema, which is
the whole reason they survived the cut.

**Every table the remaining logic needs now exists.** That was not true before
the migrations — draft bodies referenced seven tables that had never been
drafted at all (`ApprovalProcesses`, `ApprovalProcessSteps`,
`PointTransferRequests`, `BadgeGroupAssociations`, `UserPointTransferLimits`,
`RoadmapWorkflow`, `RoadmapWorkflowTasks`). All of them have a home now, so the
functions are no longer blocked on missing tables; they are blocked on being
rewritten to the live conventions. `BadgeSharingAnalytics` is the one exception,
reading a `UserSharedBadges` that never existed anywhere — `dbo.SharedBadges` is
what it means.

It is **the same product, drafted earlier** — organizations, teams, badges, points,
and the workflow features built on top of them. It is not a second application's
schema. What differs is convention, not domain: `serial` integer keys instead of
uuid, no audit columns, no `OrganizationUUID` anywhere, unquoted and unschema'd
identifiers, and references to a `Users(UserId)` table that this repo does not have
(the live one is `"dbo"."Users"."UserUUID"`). So the two do not *interoperate* as
written, but the drafts are the design this schema grew out of and the backlog it
has not caught up with yet — read them as a feature inventory, not as dead code.

**Draft tables already superseded, and by what.** These files are gone; this is
the register of where each one ended up:

| Draft | Live equivalent |
|---|---|
| `Badges`, `BadgeAchievements`, `BadgeCriteria`, `BadgeCategories`, `BadgeEvents`, `BadgeEventCriteria`, `BadgeGroups`, `BadgeGroupRelationships`, `BadgeReviews`, `BadgeStatistics`, `SharedBadges` | the matching `dbo.Badge*` tables |
| `UserBadges` | `dbo.UserBadges` — columns folded in, see below |
| `PointLevels`, `UserPointLevels`, `PointMultipliers`, `PointRedemptions`, `PointTransfers` | the matching `dbo.Point*` tables |
| `Roadmaps`, `Tasks`, `TaskDependencies`, `TaskComments`, `TaskHistory`, `AssignmentHistory`, `Checklists`, `Labels` | the matching `dbo` tables, plus `dbo.TaskLabels` which had no draft |
| `ApprovalWorkflowStages`, `ApprovalRequests`, `ApprovalDecisions`, `ApprovalWorkflowPermissions` | the matching `dbo.Approval*` tables, under `dbo.ApprovalWorkflows` |
| `ApprovalProcessLogs` | `dbo.ApprovalRequestLogs` |
| `Surveys`, `SurveyQuestions`, `SurveyQuestionOptions`, `SurveyParticipants` | the matching `dbo.Survey*` tables |
| `SurveyResponses` | `dbo.SurveyAnswers` |
| `PointTypes` | `dbo.Points` |
| `PointTransactions` | `dbo.UserPoints` |
| `PointUsageLogs` | `dbo.UserPoints` |
| `UserPointTotals` | `dbo.UserTallies` |

The 11 badge tables were commented out in the original file, which lines up exactly
with the live `dbo.Badge*` tables — they were already migrated before any of this
started. Their drafts have been deleted along with the other 28.

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

Twenty-five draft tables are live so far, uuid-keyed, org-scoped and audited.
The five points tables:
`PointLevels`, `UserPointLevels`, `PointMultipliers`, `PointRedemptions`,
`PointTransfers`. The draft versions stay where they are.

Which half of a pair gets `OrganizationUUID` follows what was already here:
definition tables are global (`Points`, `Badges`, and now `PointLevels` and
`PointMultipliers`), per-user tables are scoped (`UserPoints`, `UserBadges`, and
now `UserPointLevels`, `PointRedemptions`, `PointTransfers`). `UserPointLevels`
drops the draft's `PointTypeId`: the level it names already carries the point
type, so repeating it would let the two disagree.

### The badge functions

Seventeen badge drafts became six functions plus one extension. `dbo.GetBadges`
already existed and already did what `GetUserBadges` did, so it grew arguments
rather than a sibling.

| Live function | Replaces |
|---|---|
| `GetBadges` *(extended)* | `GetUserBadges`, `GetRecentlyEarnedBadges`, `GetUserRareBadges` |
| `GetBadgeHolders` | `GetUsersWithBadge`, `GetBadgeOwners` |
| `GetBadgeProgress` | `GetBadgeProgress`, `GetUserBadgeProgressSummary`, `GetNextPotentialBadges`, `SuggestBadgesForUser` |
| `GetBadgeGroups` | `GetBadgeGroups`, `GetBadgeGroupProgress` |
| `GetBadgeStatistics` | `BadgeCompletionAnalytics`, `BadgeSharingAnalytics` |
| `GetExpiredBadges` | `CheckExpiredBadges` |
| `AwardBadgeToUser` | `AwardBadgeToUser` |
| `CreateBadgeGroup` | `CreateBadgeGroup` |

**`GetUsersWithBadge` and `GetBadgeOwners` were byte-identical** — an exact
duplicate pair that the earlier passes over `Drafts/` did not catch. Both are
`GetBadgeHolders`.

**Four drafts counted a badge in progress as a badge held.** Once `EarnedAt` and
`RevokedAt` existed, "has a `UserBadges` row" stopped meaning "holds the badge",
and every draft predates that. `GetBadgeGroupProgress` counted rows without
checking, so a half-finished badge completed the group; `CheckExpiredBadges`
reported lapsed badges against people who had never earned them. Every reader
here filters on earned-and-unrevoked.

**`BadgeCompletionAnalytics` computed a meaningless rate.** It divided
completions by `COUNT(DISTINCT UserId)` over `UserBadges` — the share of people
already holding a badge who hold it, near 100% by construction. It also joined
`BadgeCriteria` without grouping by it, so a badge with two criteria counted
every holder twice. `GetBadgeStatistics` rates holders against holders plus
in-progress, and `TestGetBadgeStatistics_AreNotDoubledByASecondCriteria` guards
the double-count.

**`AwardBadgeToUser` would have awarded nothing.** It inserted a bare
`UserBadges` row, which in this schema means a NULL `EarnedAt` — a badge *in
progress*, invisible to every reader. It now sets `EarnedAt`, completes a badge
already being worked towards rather than colliding on the unique key, and lifts
a previous revocation.

**`GetBadgeProgress` caps its percentage at 100.** The draft divided without a
bound, so progress past the goal reported over 100%.

**Two did not come across.** `AssignBadgesInBulk` looped an array of users — a
caller's loop, as with the bulk point procedures. `BadgeSharingAnalytics` read a
`UserSharedBadges` table that never existed anywhere; `dbo.SharedBadges` is what
it meant, and `GetBadgeStatistics` reads that.

### The points writers

Thirteen point-writing drafts became seven functions. The live schema has no
stored procedures — every object under `sql/Functions/` is a function, and
these are too.

| Live function | Replaces |
|---|---|
| `AddUserPoints` | `AddPointsToUser`, `SpendPoints`, `RevokePointsFromUser` |
| `ReverseUserPoints` | `ReversePointTransaction` |
| `GetPointMultiplier` | `ApplyPointMultiplier` |
| `RequestPointTransfer` | `TransferPoints`, `BulkTransferPoints` |
| `SettlePointTransfer` | `ConfirmPointTransfer`, `ApprovePointTransferRequest` |
| `RequestPointRedemption` | `RedeemPoints`, `RedeemPointsForReward` |
| `SettlePointRedemption` | — the settlement half of the same |

**This is where "nothing moves a balance" finally closes.** `SettlePointTransfer`
writes the matching pair of `UserPoints` rows and `SettlePointRedemption` writes
the negative one; `calculate_tallies` carries both into the tallies.

**The drafts maintained the balance by hand, twice.** Every one of them wrote a
row to the ledger *and* a row to the running total. In this schema only the
ledger row is written and `calculate_tallies` derives the rest, because two
hand-maintained copies of a balance is how they drift apart. `ConfirmPointTransfer`
was the worst case: it updated both totals and touched no ledger at all, so the
balance and its history disagreed from then on.

**Request and settle are separate, which fixes a real bug.** `RedeemPoints`
checked affordability, deducted the points, *and* filed the redemption as
`Pending` — so a redemption awaiting approval had already been paid for, and
rejecting it returned nothing. The check stays at request time; the deduction
happens at settlement, and rejection costs nothing.

**`ApplyPointMultiplier` did something nobody wanted.** It multiplied the user's
whole balance by the factor, so opening a "double points" event retroactively
doubled everything they had ever earned. `GetPointMultiplier` returns the factor
in force (largest wins when windows overlap, 1 when none) and `AddUserPoints`
scales the award by it only when asked.
`TestAddUserPoints_MultiplierDoesNotTouchEarlierRows` is the guard.

**`UserPoints` gained `ReversesUserPointUUID`**, unique and self-referencing.
`ReversePointTransaction` wrote the negation and nothing more, so one
transaction could be reversed any number of times, each moving the balance
again. Now the second attempt fails.

**Authorization, which the drafts had none of.** Granting, revoking, reversing
and settling are owner acts and check `IsOwnerOfOrganization`. Requesting a
transfer or a redemption spends your own points, so those check membership and
force the caller to be the sender. `TestSettlePointTransfer_RejectsANonOwner`
catches the obvious hole: a sender approving their own transfer.

**Three drafts did not come across.** `BulkTransferPoints` and
`BulkRedeemPointsForRewards` looped over an array — a caller's loop, not a
database function. `RedeemPointsForReward` and its bulk sibling read a `Rewards`
table that never existed anywhere. `PointRollover` is in `Unbuilt.sql` with the
reasoning: it read a `DailyPoints` column that never existed and computed
"unused" as used minus cap, the subtraction inverted, and the coherent reading
of carry-over is already `UserPoints."ExpiresAt"`.

### The points readers

Eighteen point-reading drafts became seven functions. The collapse was the
point: most of them were one query with a different `WHERE` clause.

| Live function | Replaces |
|---|---|
| `GetPointHistory` | `GetUserPointTransactions`, `GetPointActivityHistory`, `GetPointEarningsHistory`, `GetPointTransactionsByType`, `AuditPointTransactions`, `CheckExpiringPoints` |
| `GetPointTotals` | `CalculateUserDailyPoints`, `CalculateUserWeeklyPoints`, `CalculateUserMonthlyPoints`, `GetTotalPointsEarned` |
| `GetPointLeaderboard` | `GetPointLeaderboard`, `GetPointLeaderboardForGroup` |
| `GetPointStatistics` | `GetPointUsageStatistics` |
| `GetPointRedemptions` | `GetPointRedemptionHistory` |
| `GetPointTransfers` | `GetPointTransferHistory` |
| `CheckPointTransferLimit` | `CheckPointTransferLimits` |

**Every one of them now authorises.** The drafts had none at all —
`GetUserPointTransactions(UserId)` handed any caller any user's ledger. All
seven take `(_LoginName, _OrganizationUUID)` and check
`IsMemberOfOrganization` the way `GetBadges` and `GetPoints` do, and each has a
test proving an outsider gets nothing back.

**Two drafts did not come across.** `CalculateUserPointBalance` summed the
ledger to get a balance, which `dbo.UserTallies` already holds and
`dbo.GetTallies` already reads — a second answer to a settled question.
`ExportPointHistoryToCsv` formatted rows as CSV, which is not the database's
job.

**The ledger total is not the balance**, and `GetPointTotals` versus
`GetTallies` is where that shows: totals count expired rows because they
describe what moved, tallies drop them because they describe what is still
good. For the member fixture that is 17.5 against 12.5.
`TestGetPointTotals_DifferFromTheBalanceByTheExpiredRows` pins the pair
together so neither drifts.

**`UserTallies` gained `DailyTransferLimit` and `MonthlyTransferLimit`.**
`CheckPointTransferLimits` was the largest draft in the folder and read two
tables that never existed — `UserPointTransferLimits` for the caps and a
`PointTransfers` carrying `PointsChange`. The existing `DailyLimit` (earning)
and `SpendLimit` (spending) do not express a cap on transfers out, so rather
than overload them the two columns came with the function. NULL means no cap,
and only `Completed` transfers count against them.

The draft also matched the calendar month with `EXTRACT(MONTH FROM ...)`, which
matches that month in *every* year. The live one uses `date_trunc('month', now())`.

### The platform tables

Six drafts in, six tables out, but not one for one.

**`UserRoles` defined roles and assigned none.** The draft table of that name
held `RoleId`, `RoleName`, `Description` and nothing linking a user to one —
the same gap `Labels` had. It became `dbo.Roles`, and `dbo.UserRoles` is the
assignment that makes it mean something.

**`ActivityFeed` and `EventLog` were one table written twice.** Same shape,
same append-only purpose, differing only in whether the row carried a type —
and with two of them there is no rule for which one anything writes to, which
is the argument that sank `PointUsageLogs`. They are `dbo.EventLog`.
`IsUserVisible` is what lets one table serve both readers: flagged rows are
somebody's activity feed, the rest is the audit trail. That column is the one
thing neither draft had.

**Three columns were added that no draft carried**, each because the table
cannot answer its own question without them: `Notifications."ReadAt"` (nothing
else distinguishes seen from unseen), `EventLog."IsUserVisible"` (above), and
`Attachments`' check that exactly one of `TaskUUID`/`TaskCommentUUID` is set —
the draft left both nullable and said nothing.

`Notifications."TaskUUID"` is nullable now. The draft assumed every
notification was about a task, and most of what this schema would notify on —
a badge, an approval, a point transfer — is not one.

**The schema now has four unconnected authorization mechanisms** and no live
function consults more than one of them:

| Mechanism | Read by |
|---|---|
| `Users."IsAdmin"`, `UserOrganizations."IsOwner"`, `UserTeams."IsManager"` | the live functions |
| `dbo.ApprovalWorkflowPermissions` | nothing |
| `dbo.AccessControlLists` | nothing |
| `dbo.Roles` + `dbo.UserRoles` | nothing |

`TestAccessControlLists_AreNotConsultedByAnything` holds that down: the
fixtures give an outsider a Read grant on a task and he still belongs to
nothing. Picking one of these and deleting the others is a real decision
waiting to be made.

### Approvals

Six tables: `ApprovalWorkflows`, `ApprovalWorkflowStages`,
`ApprovalWorkflowPermissions`, `ApprovalRequests`, `ApprovalDecisions`,
`ApprovalRequestLogs`.

**The drafts' two approval models were not rivals.** `ApprovalProcesses` +
`ApprovalProcessSteps` (read by 9 objects, never written as tables) is a
*template*: a named process with ordered steps and an approver each.
`ApprovalRequests` + `Decisions` + `Logs` + `Stages` (5 tables, 17 objects) is a
*running instance*. Each was half a design. `ApprovalProcessSteps` looked like a
rival because it mixed template columns (`Name`, `ApproverId`) with per-request
ones (`Completed`, `ApprovalStatus`, `ApprovalComments`,
`CompletionTimestamp`) in a single table; those split across
`ApprovalWorkflowStages` and `ApprovalDecisions` here. `ApprovalWorkflows` is the
root the second model never had, which is why its `ApprovalWorkflowStages` was a
flat parentless list.

**What gets approved is three typed nullable foreign keys, not an untyped id.**
The draft `ApprovalRequests` carried `TaskId` plus an `ItemId INT` referencing
nothing. Here it is `TaskUUID`, `PointRedemptionUUID` and `PointTransferUUID`,
all real foreign keys, with
`CHECK (num_nonnulls(...) = 1)` so exactly one is set. A fourth approvable thing
costs a column and a line in the check — cheap, because schema changes are edits
and there are no migrations. The alternative, a polymorphic
`SubjectType`/`SubjectUUID` pair, would have been shorter and carried no
referential integrity at all.

`dbo.UserBadges` is not among the subjects: it has no single-column key to point
at, only the composite unique. Giving it a surrogate key is the prerequisite if
badge awards should run through approvals.

**`dbo.BadgeReviews` is now a special case of this.** It predates these tables
and does the same job for badges — `Status`, `Comment`, `ReviewedAt`, a
reviewer. It was left alone rather than folded in, so there are two approval
paths in the schema. Folding it in means the `UserBadges` key above plus
rewriting its tests and seeds.

**Nothing in here runs a workflow.** Recording a decision does not advance the
request, no stage order is enforced, and `ApprovalWorkflowPermissions` is
advisory — `ApprovalDecisions` takes a decision from anybody.
`TestApprovalDecisions_DoNotAdvanceTheRequest` and
`TestApprovalDecisions_DoNotEnforceStagePermissions` hold those down. A request
that has left the stages has a NULL `CurrentStageUUID`; the outcome is in
`Status`.

**`dbo.GetApprovalWorkflowStagesCount` is how long a workflow is.** The draft
counted every row in `ApprovalWorkflowStages` across the whole database — no
organization, and no workflow either, since the parent table did not exist yet.
The live one joins through `ApprovalWorkflows` to scope the count, and takes an
optional workflow to narrow it to one. A non-member gets 0, which is also what
an empty workflow returns; neither is a workflow you can send a request into,
so the ambiguity costs nothing.

**One integrity gap left open.** A decision names a request and a stage
independently, so it can cite a stage from a workflow the request is not
running. Closing it means carrying `ApprovalWorkflowUUID` on the decision and
using a composite foreign key, the way `SurveyAnswers` does below.
`TestApprovalDecisions_AcceptAStageFromAnotherWorkflow` records the current
behaviour.

### Surveys

Five tables: `Surveys`, `SurveyQuestions`, `SurveyQuestionOptions`,
`SurveyParticipants`, `SurveyAnswers`.

**This area is a design, not a migration.** Not one of the drafts' 169 functions
and procedures references a survey table — the five draft tables have no logic
behind them at all.

**`SurveyAnswers` replaces the draft's `SurveyResponses`.** The draft stored
every answer in a `ResponseData jsonb` blob, which contradicted its own
`SurveyQuestionOptions`: with each answer opaque, nothing ever referenced an
option row and "how many people chose this option" was unanswerable, which is
most of what a survey is for. One row per answer instead, carrying either a
chosen option or free text — `CHECK (num_nonnulls(...) >= 1)`.

**The unique key is `NULLS NOT DISTINCT`**, which is unusual enough to say out
loud. `(SurveyParticipantUUID, SurveyQuestionUUID, SurveyQuestionOptionUUID)`
has to allow several rows per question for a multi-choice answer, but only one
free-text answer per question. Postgres normally treats NULLs as distinct, so a
plain `UNIQUE` would let a participant leave any number of text answers.

**The option foreign key is composite on purpose.** `SurveyQuestionOptions`
carries a redundant `UNIQUE (SurveyQuestionOptionUUID, SurveyQuestionUUID)` —
the first column is already its primary key — so that `SurveyAnswers` can
reference both columns at once and an answer cannot pair one question with
another question's option. `MATCH SIMPLE`, the default, skips the check when the
option is NULL, so free text still works.

**Answers are identified, not anonymous.** `SurveyParticipantUUID` leads back to
a named user, and `TestSurveyAnswers_AreAttributableToAUser` says so. This is a
schema decision rather than something to filter later: anonymous responses mean
keying answers to the survey and recording only completion on
`SurveyParticipants`, which loses per-participant validation and the ability to
resume a part-finished survey.

**The draft's `ParticipantId` collision is gone.**
`SurveyResponses.ParticipantId` referenced `Users(UserId)` while
`SurveyParticipants.ParticipantId` was that table's own primary key — one name
for two different things. The participant row and the user it points at are now
separate columns.

### Tasks and roadmaps

Nine tables: `Roadmaps`, `Tasks`, `TaskDependencies`, `TaskComments`,
`TaskHistory`, `AssignmentHistory`, `Checklists`, `Labels`, `TaskLabels`.

**The drafts held two incompatible task models and neither was complete.**
`Drafts/Tables/Tasks.sql` has `Title`, `Status`, `AssignedUserId`, `RoadmapId`.
Every draft function and procedure instead reads a `RoadmapWorkflowTasks` that
was never drafted as a table, with `Name`, a `Completed` boolean, `AssignedTo`
and `TaskOrder`. `Priority` and `Category` appear in neither, though
`GetTasksByPriority` and `GetTasksByCategory` filter on them. `dbo.Tasks` is the
union: `Name` and `SortOrder` from the second, `Status` from the first because
it says everything `Completed` did and more — and because `BadgeReviews`,
`PointRedemptions` and `PointTransfers` already use a `Status` varchar —
plus `Priority` and `Category` from the stubs.

**`Status` does not translate to `Completed` cleanly, and the difference bites.**
`GetOverdueTasks` read `DueDate < CURRENT_DATE AND Completed = false`. Carried
over as `Status <> 'Completed'` that reports cancelled tasks as overdue, because
`'Cancelled'` is also not `'Completed'`. Overdue is
`Status NOT IN ('Completed', 'Cancelled')`. Both the fixtures and
`Seeds/Dev/16_Tasks.sql` carry a task cancelled while already past due, and
`TestTasks_DoNotCountCancelledTasksAsOverdue` runs the naive filter alongside the
correct one so the difference is visible rather than theoretical.

**`Tasks."DependencyId"` was dropped.** The draft had `Tasks` pointing at
`TaskDependencies` while `TaskDependencies` pointed back at `Tasks` twice —
circular, and it allowed a task exactly one dependency. `dbo.TaskDependencies`
is now the whole relation. Nothing rejects a cycle or a self-dependency; that
belongs to whatever advances a task's status, and there are tests saying so.

**`dbo.ReorderTasks` is the one function these tables have**, and the draft
behind it could not have run. `FOR TaskId, position IN ARRAY TaskIds` is not
plpgsql; it wrote the `RoadmapWorkflowTasks` that never existed; and
`WHERE TaskId = TaskId` compared the parameter to itself, so it matched every
row in the table and would have stamped one order number onto all of them. The
live one is `unnest(...) WITH ORDINALITY` in a single statement — the array
*is* the order — scoped to an organization, refusing a duplicate task or one
from elsewhere rather than half-applying the move.
`TestReorderTasks_PutsTasksInTheOrderGiven` is the regression test for the
shadowed parameter: three tasks, three different numbers.

**`dbo.TaskLabels` is not from the drafts.** `Drafts/Tables/Labels.sql` defines
labels and nothing that wears one — no draft table, function or procedure
references it. Migrating `Labels` alone would have added an inert table, so the
join that makes it mean something came with it. It is the only object in this
schema with no draft behind it.

**`Tasks` carries `OrganizationUUID` itself** rather than reaching it through
`Roadmaps`, because `RoadmapUUID` is nullable — a task does not have to belong
to a roadmap. The child tables (`TaskComments`, `Checklists`, `TaskHistory`,
`AssignmentHistory`, `TaskLabels`) derive their scope through `TaskUUID`, the
way `UserTeams` derives through `TeamUUID`.

**The draft's `ON DELETE CASCADE` on `Tasks.RoadmapId` was dropped.** Nothing
else in this schema uses one, so deleting a roadmap that still has tasks now
raises instead of silently taking them with it.

**`TaskHistory` and `AssignmentHistory` are not written by anything.** No trigger
fills them the way `calculate_tallies` fills `UserTallies`, so editing a task
logs nothing — the caller has to write the row.
`TestTaskHistory_IsNotWrittenByUpdatingATask` pins that down. They are also
distinct from the audit columns: `CreatedBy`/`UpdatedBy` say who last touched a
row, these say what changed.

**`PointUsageLogs` was deliberately not migrated.** It is a second ledger with
the same shape as `PointTransactions` — user, signed amount, reason, JSON
details, timestamp — and `dbo.UserPoints` is already that table, with `Reason`
and `Details` folded in above. Creating it would have given the schema two
ledgers and no rule for which one a balance comes from. The drafts read
`PointUsageLogs` in 20 files and `PointTransactions` in 3; both should be read
as `dbo.UserPoints` when those functions are migrated.

**The tables still move nothing by themselves — the functions do.** A row in
`PointRedemptions` or `PointTransfers` is a record of intent, and writing
`Status = 'Completed'` into it by hand changes nobody's tally, because
`calculate_tallies` sums `dbo.UserPoints` and nothing else. That gap was open
until `dbo.SettlePointTransfer` and `dbo.SettlePointRedemption` arrived; they
are the only things that write the ledger rows a settlement implies. Going
round them by updating `Status` directly still silently moves nothing, which is
what `TestPointTransfers_DoNotMoveEitherBalance` and
`TestPointRedemptions_DoNotImplyTheBalanceMoved` still assert.
`PointMultipliers` is the same shape: the factor is stored, and
`dbo.AddUserPoints` applies it only when asked.

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
