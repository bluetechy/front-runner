--
-- Decisions and stage logs. The thing to know about both: they are records,
-- not machinery. Writing a decision does not move the request, and nothing
-- checks that the approver was allowed to make it.
--

CREATE FUNCTION "test"."TestApprovalDecisions_TraceARequestThroughItsStages" () RETURNS void AS $$
DECLARE
    _Trace text;
BEGIN
    SELECT string_agg(format('%s:%s', "Stages"."Name", "ApprovalDecisions"."Status"), ', ' ORDER BY "Stages"."SortOrder") INTO _Trace
    FROM "dbo"."ApprovalDecisions"
        JOIN "dbo"."ApprovalWorkflowStages" AS "Stages" ON ("Stages"."ApprovalWorkflowStageUUID" = "ApprovalDecisions"."ApprovalWorkflowStageUUID")
    WHERE "ApprovalDecisions"."ApprovalRequestUUID" = "test"."Fixture"('Request.Finished');

    PERFORM "test"."AssertEquals"(_Trace, 'Manager:Approved, Finance:Approved', 'the finished request should show both stages signed off in order');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestApprovalDecisions_RejectTheSameApproverTwiceAtAStage" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertRaises"(
        format(
            'INSERT INTO "dbo"."ApprovalDecisions" ("ApprovalRequestUUID", "ApprovalWorkflowStageUUID", "ApproverUserUUID", "Status", "CreatedBy") VALUES (%L, %L, %L, ''Rejected'', ''test'')',
            "test"."Fixture"('Request.Finished'), "test"."Fixture"('Stage.Manager'), "test"."Fixture"('User.Member')
        ),
        'ApprovalDecisions let one approver decide twice at the same stage'
    );
END;
$$ LANGUAGE plpgsql;

-- dbo.ApprovalWorkflowPermissions says only the owner may act at Finance.
-- Nothing enforces that -- whatever records a decision has to check first.
CREATE FUNCTION "test"."TestApprovalDecisions_DoNotEnforceStagePermissions" () RETURNS void AS $$
DECLARE
    _Permitted bigint;
    _Count bigint;
BEGIN
    SELECT count(*) INTO _Permitted FROM "dbo"."ApprovalWorkflowPermissions"
    WHERE "ApprovalWorkflowStageUUID" = "test"."Fixture"('Stage.Finance')
        AND "UserUUID" = "test"."Fixture"('User.Admin');
    PERFORM "test"."AssertEquals"(_Permitted, 0::bigint, 'the admin should have no permission at Finance');

    INSERT INTO "dbo"."ApprovalDecisions" ("ApprovalRequestUUID", "ApprovalWorkflowStageUUID", "ApproverUserUUID", "Status", "CreatedBy")
    VALUES ("test"."Fixture"('Request.AtFinance'), "test"."Fixture"('Stage.Finance'), "test"."Fixture"('User.Admin'), 'Approved', 'test');

    SELECT count(*) INTO _Count FROM "dbo"."ApprovalDecisions"
    WHERE "ApprovalRequestUUID" = "test"."Fixture"('Request.AtFinance')
        AND "ApproverUserUUID" = "test"."Fixture"('User.Admin');
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'the permission table is advisory -- the decision went in anyway');
END;
$$ LANGUAGE plpgsql;

-- The trap: a decision is not a transition. Recording one leaves the request
-- exactly where it was.
CREATE FUNCTION "test"."TestApprovalDecisions_DoNotAdvanceTheRequest" () RETURNS void AS $$
DECLARE
    _Stage uuid;
    _Status varchar(20);
BEGIN
    INSERT INTO "dbo"."ApprovalDecisions" ("ApprovalRequestUUID", "ApprovalWorkflowStageUUID", "ApproverUserUUID", "Status", "CreatedBy")
    VALUES ("test"."Fixture"('Request.AtFinance'), "test"."Fixture"('Stage.Finance'), "test"."Fixture"('User.Owner'), 'Approved', 'test');

    SELECT "CurrentStageUUID", "Status" INTO _Stage, _Status FROM "dbo"."ApprovalRequests"
    WHERE "ApprovalRequestUUID" = "test"."Fixture"('Request.AtFinance');

    PERFORM "test"."AssertEquals"(_Stage, "test"."Fixture"('Stage.Finance'), 'the request should not have moved -- nothing advances it');
    PERFORM "test"."AssertEquals"(_Status::text, 'Pending', 'the request should still be Pending after its last stage signed off');
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestApprovalRequestLogs_RecordBothEndsOfATransition" () RETURNS void AS $$
DECLARE
    _Raised record;
    _Closed record;
BEGIN
    SELECT * INTO _Raised FROM "dbo"."ApprovalRequestLogs"
    WHERE "ApprovalRequestUUID" = "test"."Fixture"('Request.AtFinance') AND "FromStageUUID" IS NULL;
    PERFORM "test"."AssertEquals"(_Raised."ToStageUUID", "test"."Fixture"('Stage.Manager'), 'entering the first stage has no From');

    SELECT * INTO _Closed FROM "dbo"."ApprovalRequestLogs"
    WHERE "ApprovalRequestUUID" = "test"."Fixture"('Request.Finished') AND "ToStageUUID" IS NULL;
    PERFORM "test"."AssertEquals"(_Closed."FromStageUUID", "test"."Fixture"('Stage.Finance'), 'leaving the last stage has no To');
END;
$$ LANGUAGE plpgsql;

-- Not closed, and recorded so it stays visible: a decision names a request and
-- a stage independently, so nothing stops it citing a stage from a different
-- workflow than the request is running. dbo.SurveyAnswers solves the same
-- shape of problem with a composite foreign key; doing that here would mean
-- carrying ApprovalWorkflowUUID on the decision as well. Whatever records a
-- decision has to check instead.
CREATE FUNCTION "test"."TestApprovalDecisions_AcceptAStageFromAnotherWorkflow" () RETURNS void AS $$
DECLARE
    _Workflow uuid;
    _Count bigint;
BEGIN
    SELECT "ApprovalWorkflowUUID" INTO _Workflow FROM "dbo"."ApprovalRequests"
    WHERE "ApprovalRequestUUID" = "test"."Fixture"('Request.AtFinance');
    PERFORM "test"."AssertEquals"(_Workflow, "test"."Fixture"('Workflow.Redemption'), 'the fixture request runs the Redemption workflow');

    INSERT INTO "dbo"."ApprovalWorkflows" ("ApprovalWorkflowUUID", "OrganizationUUID", "Name", "CreatedBy")
    VALUES ('99999999-0000-4000-8000-000000000001', "test"."Fixture"('Organization.Acme'), 'Unrelated', 'test');
    INSERT INTO "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowStageUUID", "ApprovalWorkflowUUID", "Name", "CreatedBy")
    VALUES ('99999999-0000-4000-8000-000000000002', '99999999-0000-4000-8000-000000000001', 'Elsewhere', 'test');

    INSERT INTO "dbo"."ApprovalDecisions" ("ApprovalRequestUUID", "ApprovalWorkflowStageUUID", "ApproverUserUUID", "Status", "CreatedBy")
    VALUES ("test"."Fixture"('Request.AtFinance'), '99999999-0000-4000-8000-000000000002', "test"."Fixture"('User.Owner'), 'Approved', 'test');

    SELECT count(*) INTO _Count FROM "dbo"."ApprovalDecisions"
    WHERE "ApprovalWorkflowStageUUID" = '99999999-0000-4000-8000-000000000002';
    PERFORM "test"."AssertEquals"(_Count, 1::bigint, 'a decision cited a stage from a workflow the request is not running');
END;
$$ LANGUAGE plpgsql;
