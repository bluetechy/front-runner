--
-- The draft gave Tasks a "DependencyId" pointing here while this table pointed
-- back at Tasks twice, which is circular and says a task has one dependency.
-- Dropping that column makes this the whole relation: many prerequisites per
-- task, and the same task free to be a prerequisite for several others.
--

CREATE FUNCTION "test"."TestTaskDependencies_ResolvePrerequisitesForATask" () RETURNS void AS $$
DECLARE
    _Names text;
BEGIN
    SELECT string_agg("Tasks"."Name", ', ' ORDER BY "Tasks"."Name") INTO _Names
    FROM "dbo"."TaskDependencies"
        JOIN "dbo"."Tasks" ON ("Tasks"."TaskUUID" = "TaskDependencies"."PrerequisiteTaskUUID")
    WHERE "TaskDependencies"."DependentTaskUUID" = "test"."Fixture"('Task.Build');

    PERFORM "test"."AssertEquals"(_Names, 'Design', 'Build should be waiting on Design');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestTaskDependencies_AllowSeveralPrerequisites" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."TaskDependencies" ("DependentTaskUUID", "PrerequisiteTaskUUID", "CreatedBy")
    VALUES ("test"."Fixture"('Task.Build'), "test"."Fixture"('Task.Overdue'), 'test');

    SELECT count(*) INTO _Count FROM "dbo"."TaskDependencies"
    WHERE "DependentTaskUUID" = "test"."Fixture"('Task.Build');
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'a task should be able to wait on more than one prerequisite');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestTaskDependencies_RejectADuplicatePair" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."TaskDependencies" ("DependentTaskUUID", "PrerequisiteTaskUUID", "CreatedBy") VALUES (%L, %L, ''test'')',
            "test"."Fixture"('Task.Build'), "test"."Fixture"('Task.Design')
        ),
        'TaskDependencies accepted the same pair twice'
    );
END;
$$ LANGUAGE plpgsql;

-- Nothing rejects a cycle, or a task depending on itself. Both belong to
-- whatever moves a task's status; recorded so the gap is deliberate.
CREATE FUNCTION "test"."TestTaskDependencies_AcceptACycle" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."TaskDependencies" ("DependentTaskUUID", "PrerequisiteTaskUUID", "CreatedBy")
    VALUES ("test"."Fixture"('Task.Design'), "test"."Fixture"('Task.Build'), 'test');

    SELECT count(*) INTO _Count FROM "dbo"."TaskDependencies"
    WHERE ("DependentTaskUUID" = "test"."Fixture"('Task.Design') AND "PrerequisiteTaskUUID" = "test"."Fixture"('Task.Build'))
        OR ("DependentTaskUUID" = "test"."Fixture"('Task.Build') AND "PrerequisiteTaskUUID" = "test"."Fixture"('Task.Design'));
    PERFORM "test"."AssertEquals"(_Count, 2::bigint, 'the table does not detect cycles -- whatever advances a task has to');
END;
$$ LANGUAGE plpgsql;
