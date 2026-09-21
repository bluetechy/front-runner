--
-- The subject check is the load-bearing part of this table: the draft carried
-- a TaskId plus an untyped "ItemId" and no way to say which one meant
-- anything. Exactly one subject, and all three are real foreign keys.
--

CREATE FUNCTION "test"."TestApprovalRequests_RejectNoSubject" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."ApprovalRequests" ("OrganizationUUID", "ApprovalWorkflowUUID", "RequestedByUserUUID", "RequestText", "CreatedBy") VALUES (%L, %L, %L, ''Nothing to approve.'', ''test'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Workflow.Redemption'), "test"."Fixture"('User.Member')
        ),
        'ApprovalRequests accepted a request that approves nothing'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestApprovalRequests_RejectTwoSubjects" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."ApprovalRequests" ("OrganizationUUID", "ApprovalWorkflowUUID", "RequestedByUserUUID", "RequestText", "TaskUUID", "PointTransferUUID", "CreatedBy") VALUES (%L, %L, %L, ''Two at once.'', %L, %L, ''test'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Workflow.Redemption'), "test"."Fixture"('User.Member'),
            "test"."Fixture"('Task.Build'), "test"."Fixture"('PointTransfer.Pending')
        ),
        'ApprovalRequests accepted a request approving two different things'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestApprovalRequests_AcceptEachSubjectType" () RETURNS void AS $$
DECLARE
    _Count bigint;
BEGIN
    INSERT INTO "dbo"."ApprovalRequests" ("OrganizationUUID", "ApprovalWorkflowUUID", "RequestedByUserUUID", "RequestText", "TaskUUID", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Acme'), "test"."Fixture"('Workflow.Redemption'), "test"."Fixture"('User.Member'), 'Sign off the build.', "test"."Fixture"('Task.Build'), 'test');

    INSERT INTO "dbo"."ApprovalRequests" ("OrganizationUUID", "ApprovalWorkflowUUID", "RequestedByUserUUID", "RequestText", "PointTransferUUID", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Acme'), "test"."Fixture"('Workflow.Redemption'), "test"."Fixture"('User.Member'), 'Let the transfer through.', "test"."Fixture"('PointTransfer.Pending'), 'test');

    SELECT count(*) INTO _Count FROM "dbo"."ApprovalRequests";
    PERFORM "test"."AssertEquals"(_Count, 4::bigint, 'a task, a transfer and the two fixture redemptions should all be approvable');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestApprovalRequests_RejectAnUnknownSubject" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."ApprovalRequests" ("OrganizationUUID", "ApprovalWorkflowUUID", "RequestedByUserUUID", "RequestText", "TaskUUID", "CreatedBy") VALUES (%L, %L, %L, ''Orphan.'', ''00000000-0000-4000-8000-000000000000'', ''test'')',
            "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Workflow.Redemption'), "test"."Fixture"('User.Member')
        ),
        'ApprovalRequests accepted a task that does not exist -- the typed subject columns are what buy this'
    );
END;
$$ LANGUAGE plpgsql;

-- A NULL CurrentStageUUID is what "out of the stages" looks like; Status says
-- how it ended.
CREATE FUNCTION "test"."TestApprovalRequests_LeaveTheStagesWhenFinished" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    SELECT * INTO _Row FROM "dbo"."ApprovalRequests" WHERE "ApprovalRequestUUID" = "test"."Fixture"('Request.Finished');
    PERFORM "test"."AssertEquals"(_Row."CurrentStageUUID", NULL::uuid, 'a finished request should sit at no stage');
    PERFORM "test"."AssertEquals"(_Row."Status"::text, 'Approved', 'the outcome lives in Status, not in the stage');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestApprovalRequests_StartPendingAtNoStage" () RETURNS void AS $$
DECLARE
    _Row record;
BEGIN
    INSERT INTO "dbo"."ApprovalRequests" ("OrganizationUUID", "ApprovalWorkflowUUID", "RequestedByUserUUID", "RequestText", "TaskUUID", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Acme'), "test"."Fixture"('Workflow.Redemption'), "test"."Fixture"('User.Member'), 'Fresh.', "test"."Fixture"('Task.Loose'), 'test')
    RETURNING * INTO _Row;

    PERFORM "test"."AssertEquals"(_Row."Status"::text, 'Pending', 'a new request should start Pending');
    PERFORM "test"."AssertEquals"(_Row."CurrentStageUUID", NULL::uuid, 'nothing puts a new request into the first stage -- the caller has to');
END;
$$ LANGUAGE plpgsql;
