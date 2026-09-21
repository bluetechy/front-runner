--
-- One row per checklist item. The draft column was "Completed"; booleans in
-- this schema lead with Is, so it is "IsCompleted" here.
--

CREATE FUNCTION "test"."TestChecklists_ReportProgressForATask" () RETURNS void AS $$
DECLARE
    _Total bigint;
    _Done bigint;
BEGIN
    SELECT count(*), count(*) FILTER (WHERE "IsCompleted") INTO _Total, _Done
    FROM "dbo"."Checklists" WHERE "TaskUUID" = "test"."Fixture"('Task.Build');

    PERFORM "test"."AssertEquals"(_Total, 2::bigint, 'the build task has two checklist items');
    PERFORM "test"."AssertEquals"(_Done, 1::bigint, 'one of them is done');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestChecklists_StartUnfinished" () RETURNS void AS $$
DECLARE
    _IsCompleted boolean;
BEGIN
    INSERT INTO "dbo"."Checklists" ("TaskUUID", "Description", "CreatedBy")
    VALUES ("test"."Fixture"('Task.Loose'), 'Something new.', 'test')
    RETURNING "IsCompleted" INTO _IsCompleted;
    PERFORM "test"."AssertFalse"(_IsCompleted, 'a new checklist item should start unfinished');
END;
$$ LANGUAGE plpgsql;

-- A completed task can still have unfinished items. Nothing reconciles them.
CREATE FUNCTION "test"."TestChecklists_DoNotHaveToAgreeWithTheTaskStatus" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    UPDATE "dbo"."Tasks" SET "Status" = 'Completed', "UpdatedBy" = 'test'
    WHERE "TaskUUID" = "test"."Fixture"('Task.Build');

    SELECT count(*) INTO _Count FROM "dbo"."Checklists"
    WHERE "TaskUUID" = "test"."Fixture"('Task.Build') AND "IsCompleted" = false;
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'completing a task leaves its checklist alone -- nothing reconciles the two');
END;
$$ LANGUAGE plpgsql;
