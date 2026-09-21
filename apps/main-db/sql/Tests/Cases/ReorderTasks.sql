-- The fixtures give Design, Build and Overdue SortOrder 1, 2 and 3. This puts
-- them back to front, which is also the regression test for the draft's
-- `WHERE TaskId = TaskId`: that matched every row, so all three would have
-- come out holding the same number.
CREATE FUNCTION "test"."TestReorderTasks_PutsTasksInTheOrderGiven" () RETURNS void AS $$
DECLARE
    _Moved integer;
    _Orders text;
BEGIN
    _Moved = "dbo"."ReorderTasks"('member', "test"."Fixture"('Organization.Acme'), ARRAY[
        "test"."Fixture"('Task.Overdue'),
        "test"."Fixture"('Task.Build'),
        "test"."Fixture"('Task.Design')
    ]);
    PERFORM "test"."AssertEquals"(_Moved, 3, 'ReorderTasks should report the three tasks it moved');

    SELECT string_agg("Tasks"."Name" || '=' || "Tasks"."SortOrder", ', ' ORDER BY "Tasks"."SortOrder")
    INTO _Orders
    FROM "dbo"."Tasks"
    WHERE "Tasks"."TaskUUID" IN (
        "test"."Fixture"('Task.Overdue'), "test"."Fixture"('Task.Build'), "test"."Fixture"('Task.Design')
    );

    PERFORM "test"."AssertEquals"(_Orders, 'Ship=1, Build=2, Design=3', 'the array order should have become the sort order');
END;
$$ LANGUAGE plpgsql;

-- Reordering some of the tasks leaves the rest where they were; the positions
-- come from the array, not from a renumbering of the whole roadmap.
CREATE FUNCTION "test"."TestReorderTasks_LeavesTasksItWasNotGivenAlone" () RETURNS void AS $$
DECLARE
    _SortOrder integer;
BEGIN
    PERFORM "dbo"."ReorderTasks"('member', "test"."Fixture"('Organization.Acme'), ARRAY[
        "test"."Fixture"('Task.Build'),
        "test"."Fixture"('Task.Design')
    ]);

    SELECT "Tasks"."SortOrder" INTO _SortOrder
    FROM "dbo"."Tasks" WHERE "Tasks"."TaskUUID" = "test"."Fixture"('Task.Overdue');

    PERFORM "test"."AssertEquals"(_SortOrder, 3, 'Ship was not in the array and should not have moved');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestReorderTasks_RecordsWhoMovedThem" () RETURNS void AS $$
DECLARE
    _UpdatedBy text;
BEGIN
    PERFORM "dbo"."ReorderTasks"('member', "test"."Fixture"('Organization.Acme'), ARRAY["test"."Fixture"('Task.Design')]);

    SELECT "Tasks"."UpdatedBy" INTO _UpdatedBy
    FROM "dbo"."Tasks" WHERE "Tasks"."TaskUUID" = "test"."Fixture"('Task.Design');

    PERFORM "test"."AssertEquals"(_UpdatedBy, 'member', 'the reorder should be attributed to its caller');
END;
$$ LANGUAGE plpgsql;

-- Task.Loose belongs to no roadmap. The positions come from the array, so it
-- sits in the run like anything else rather than being skipped or renumbered
-- against a roadmap it does not have.
CREATE FUNCTION "test"."TestReorderTasks_NumbersByArrayPositionNotByRoadmap" () RETURNS void AS $$
DECLARE
    _SortOrder integer;
BEGIN
    PERFORM "dbo"."ReorderTasks"('member', "test"."Fixture"('Organization.Acme'), ARRAY[
        "test"."Fixture"('Task.Design'),
        "test"."Fixture"('Task.Loose'),
        "test"."Fixture"('Task.Build')
    ]);

    SELECT "Tasks"."SortOrder" INTO _SortOrder
    FROM "dbo"."Tasks" WHERE "Tasks"."TaskUUID" = "test"."Fixture"('Task.Loose');
    PERFORM "test"."AssertEquals"(_SortOrder, 2, 'a task with no roadmap should take its array position');

    SELECT "Tasks"."SortOrder" INTO _SortOrder
    FROM "dbo"."Tasks" WHERE "Tasks"."TaskUUID" = "test"."Fixture"('Task.Build');
    PERFORM "test"."AssertEquals"(_SortOrder, 3, 'and the roadmap task after it takes the next one');
END;
$$ LANGUAGE plpgsql;

-- The owner is a member of both organizations, so the membership check passes
-- and only the per-task scope check can catch this. Nothing may move: the
-- exception takes the whole reorder with it.
CREATE FUNCTION "test"."TestReorderTasks_RefusesATaskFromAnotherOrganization" () RETURNS void AS $$
DECLARE
    _ElsewhereUUID uuid;
    _SortOrder integer;
BEGIN
    INSERT INTO "dbo"."Tasks" ("OrganizationUUID", "Name", "SortOrder", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Disabled'), 'Someone elses', 9, 'test')
    RETURNING "TaskUUID" INTO _ElsewhereUUID;

    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."ReorderTasks"(%L, %L, ARRAY[%L, %L]::uuid[])',
            'owner', "test"."Fixture"('Organization.Acme'), _ElsewhereUUID, "test"."Fixture"('Task.Design')),
        'ReorderTasks moved a task belonging to another organization',
        'not in this organization'
    );

    SELECT "Tasks"."SortOrder" INTO _SortOrder
    FROM "dbo"."Tasks" WHERE "Tasks"."TaskUUID" = "test"."Fixture"('Task.Design');
    PERFORM "test"."AssertEquals"(_SortOrder, 1, 'a refused reorder must not have moved anything');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestReorderTasks_RefusesATaskThatDoesNotExist" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."ReorderTasks"(%L, %L, ARRAY[%L]::uuid[])',
            'member', "test"."Fixture"('Organization.Acme'), '00000000-0000-4000-8000-000000000000'),
        'ReorderTasks accepted a task UUID that is not a task',
        'not in this organization'
    );
END;
$$ LANGUAGE plpgsql;

-- Two positions for one task is a caller mistake with no right answer, so it
-- is refused rather than resolved.
CREATE FUNCTION "test"."TestReorderTasks_RefusesTheSameTaskTwice" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."ReorderTasks"(%L, %L, ARRAY[%L, %L]::uuid[])',
            'member', "test"."Fixture"('Organization.Acme'),
            "test"."Fixture"('Task.Design'), "test"."Fixture"('Task.Design')),
        'ReorderTasks accepted the same task in two positions',
        'more than once'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestReorderTasks_RefusesANonMember" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format('SELECT "dbo"."ReorderTasks"(%L, %L, ARRAY[%L]::uuid[])',
            'outsider', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Task.Design')),
        'ReorderTasks let a caller outside the organization reorder its tasks',
        'does not belong to this organization'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestReorderTasks_AcceptsAnEmptyArray" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"(
        "dbo"."ReorderTasks"('member', "test"."Fixture"('Organization.Acme'), ARRAY[]::uuid[]),
        0,
        'reordering nothing should move nothing rather than raise'
    );
END;
$$ LANGUAGE plpgsql;
