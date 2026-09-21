--
-- No function reads dbo.Tasks yet. What these pin down is the shape the draft
-- readers assumed, translated to the columns that actually exist -- so that
-- when GetOverdueTasks and friends are migrated, the queries underneath them
-- are already known to work.
--

-- GetOverdueTasks read "DueDate < CURRENT_DATE AND Completed = false". A
-- Status says more than that boolean did, and the translation is not the
-- obvious one: 'Cancelled' is also not 'Completed', and a task called off
-- before its due date is not overdue. Both terminal states have to be excluded.
CREATE FUNCTION "test"."TestTasks_FindTheOverdueOnes" () RETURNS void AS $$
DECLARE
    _Names text;
BEGIN
    SELECT string_agg("Name", ', ' ORDER BY "Name") INTO _Names FROM "dbo"."Tasks"
    WHERE "OrganizationUUID" = "test"."Fixture"('Organization.Acme')
        AND "DueDate" < CURRENT_DATE
        AND "Status" NOT IN ('Completed', 'Cancelled');

    PERFORM "test"."AssertEquals"(_Names, 'Ship', 'only the pending task with a past due date is overdue');
END;
$$ LANGUAGE plpgsql;

-- The mistake this guards, spelled out: drop 'Cancelled' from the exclusion
-- and a task nobody is working on comes back as late.
CREATE FUNCTION "test"."TestTasks_DoNotCountCancelledTasksAsOverdue" () RETURNS void AS $$
DECLARE
    _Lazy text;
    _Correct text;
BEGIN
    SELECT string_agg("Name", ', ' ORDER BY "Name") INTO _Lazy FROM "dbo"."Tasks"
    WHERE "DueDate" < CURRENT_DATE AND "Status" <> 'Completed';
    SELECT string_agg("Name", ', ' ORDER BY "Name") INTO _Correct FROM "dbo"."Tasks"
    WHERE "DueDate" < CURRENT_DATE AND "Status" NOT IN ('Completed', 'Cancelled');

    PERFORM "test"."AssertEquals"(_Lazy, 'Dropped, Ship', 'the naive filter should pick up the cancelled task');
    PERFORM "test"."AssertEquals"(_Correct, 'Ship', 'excluding both terminal states should leave only the real overdue task');
END;
$$ LANGUAGE plpgsql;

-- The completed task with a past due date must not count as overdue, and the
-- task with no due date at all must not either.
CREATE FUNCTION "test"."TestTasks_ExcludeCompletedAndUndatedFromOverdue" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."Tasks"
    WHERE "DueDate" < CURRENT_DATE AND "Status" NOT IN ('Completed', 'Cancelled')
        AND "Name" IN ('Retro', 'Standalone');
    PERFORM "test"."AssertEquals"(_Count, 0::bigint, 'a completed task and an undated task are both not overdue');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestTasks_FilterByAssignee" () RETURNS void AS $$
DECLARE
    _Names text;
BEGIN
    SELECT string_agg("Name", ', ' ORDER BY "Name") INTO _Names FROM "dbo"."Tasks"
    WHERE "AssignedUserUUID" = "test"."Fixture"('User.Member');
    PERFORM "test"."AssertEquals"(_Names, 'Build, Design', 'the member holds two tasks');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestTasks_FilterByCategoryAndPriority" () RETURNS void AS $$
DECLARE
    _Names text;
BEGIN
    SELECT string_agg("Name", ', ' ORDER BY "Priority" DESC) INTO _Names FROM "dbo"."Tasks"
    WHERE "Category" = 'Build';
    PERFORM "test"."AssertEquals"(_Names, 'Build, Ship', 'Category and Priority both come from stubs that filtered on columns no draft table had');
END;
$$ LANGUAGE plpgsql;

-- A task does not need a roadmap, which is the reason OrganizationUUID sits on
-- Tasks rather than being reached through Roadmaps.
CREATE FUNCTION "test"."TestTasks_CanStandOutsideARoadmap" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."Tasks" WHERE "TaskUUID" = "test"."Fixture"('Task.Loose');
    PERFORM "test"."AssertEquals"(_Row."RoadmapUUID", NULL::uuid, 'the standalone task should have no roadmap');
    PERFORM "test"."AssertEquals"(_Row."OrganizationUUID", "test"."Fixture"('Organization.Acme'), 'a roadmap-less task is still scoped to an organization');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestTasks_DefaultToPendingAndUnassigned" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    INSERT INTO "dbo"."Tasks" ("OrganizationUUID", "Name", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Acme'), 'Fresh', 'test')
    RETURNING * INTO _Row;

    PERFORM "test"."AssertEquals"(_Row."Status"::text, 'Pending', 'a new task should start Pending');
    PERFORM "test"."AssertEquals"(_Row."AssignedUserUUID", NULL::uuid, 'a new task should start unassigned');
    PERFORM "test"."AssertEquals"(_Row."Priority", 0, 'a new task should start at priority zero');
    PERFORM "test"."AssertEquals"(_Row."SortOrder", 0, 'a new task should start at sort order zero');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestTasks_RejectAnUnknownRoadmap" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."Tasks" ("OrganizationUUID", "RoadmapUUID", "Name", "CreatedBy") VALUES (%L, ''00000000-0000-4000-8000-000000000000'', ''Orphan'', ''test'')',
            "test"."Fixture"('Organization.Acme')
        ),
        'Tasks accepted a roadmap that does not exist'
    );
END;
$$ LANGUAGE plpgsql;

-- Deleting a roadmap does not take its tasks with it. The draft had
-- ON DELETE CASCADE; nothing else in this schema uses one, so it was dropped.
CREATE FUNCTION "test"."TestTasks_BlockDeletingARoadmapThatStillHasTasks" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('DELETE FROM "dbo"."Roadmaps" WHERE "RoadmapUUID" = %L', "test"."Fixture"('Roadmap.Launch')),
        'a roadmap with tasks on it was deleted, orphaning or removing them'
    );
END;
$$ LANGUAGE plpgsql;
