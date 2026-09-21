--
-- TaskHistory and AssignmentHistory are logs, distinct from the audit columns:
-- CreatedBy/UpdatedBy say who last touched a row, these say what changed.
-- Nothing writes them automatically -- no trigger fills them the way
-- calculate_tallies fills UserTallies -- so whatever edits a task has to.
--

CREATE FUNCTION "test"."TestTaskHistory_RecordsWhatChanged" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."TaskHistory"
    WHERE "TaskUUID" = "test"."Fixture"('Task.Build') AND "ChangeType" = 'Status';

    PERFORM "test"."AssertEquals"(_Row."OldValue", 'Pending', 'the status change should record where it came from');
    PERFORM "test"."AssertEquals"(_Row."NewValue", 'InProgress', 'the status change should record where it went');
END;
$$ LANGUAGE plpgsql;

-- Not every change has a person behind it, so UserUUID is nullable.
CREATE FUNCTION "test"."TestTaskHistory_AllowsAChangeWithNoUser" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Count FROM "dbo"."TaskHistory"
    WHERE "TaskUUID" = "test"."Fixture"('Task.Build') AND "UserUUID" IS NULL;
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'a change with no user behind it should be recordable');
END;
$$ LANGUAGE plpgsql;

-- The trap: editing a task writes nothing here. The log is not automatic.
CREATE FUNCTION "test"."TestTaskHistory_IsNotWrittenByUpdatingATask" () RETURNS void AS $$
DECLARE
    _Before bigint;
    _After bigint;
BEGIN
    SELECT count(*) INTO _Before FROM "dbo"."TaskHistory" WHERE "TaskUUID" = "test"."Fixture"('Task.Build');

    UPDATE "dbo"."Tasks" SET "Status" = 'Completed', "UpdatedBy" = 'test'
    WHERE "TaskUUID" = "test"."Fixture"('Task.Build');

    SELECT count(*) INTO _After FROM "dbo"."TaskHistory" WHERE "TaskUUID" = "test"."Fixture"('Task.Build');
    PERFORM "test"."AssertEquals"(_After, _Before, 'nothing logs a task edit automatically -- the caller has to write the row');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestAssignmentHistory_RecordsBothEndsOfAMove" () RETURNS void AS $$
DECLARE
    _First record;
    _Unassign record;
BEGIN
    SELECT * INTO _First FROM "dbo"."AssignmentHistory" WHERE "TaskUUID" = "test"."Fixture"('Task.Build');
    PERFORM "test"."AssertEquals"(_First."PreviousUserUUID", NULL::uuid, 'a first assignment has no previous holder');
    PERFORM "test"."AssertEquals"(_First."NewUserUUID", "test"."Fixture"('User.Member'), 'the first assignment should name the new holder');

    SELECT * INTO _Unassign FROM "dbo"."AssignmentHistory" WHERE "TaskUUID" = "test"."Fixture"('Task.Done');
    PERFORM "test"."AssertEquals"(_Unassign."NewUserUUID", NULL::uuid, 'unassigning has no new holder');
    PERFORM "test"."AssertEquals"(_Unassign."PreviousUserUUID", "test"."Fixture"('User.Owner'), 'unassigning should still name who held it');
END;
$$ LANGUAGE plpgsql;
