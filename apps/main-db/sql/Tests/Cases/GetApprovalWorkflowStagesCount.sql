CREATE FUNCTION "test"."TestGetApprovalWorkflowStagesCount_CountsTheStagesOfOneWorkflow" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"(
        "dbo"."GetApprovalWorkflowStagesCount"('member', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Workflow.Redemption')),
        2::bigint,
        'the Redemption workflow has a Manager stage and a Finance stage'
    );
END;
$$ LANGUAGE plpgsql;

-- With no workflow named the count spans the organization, which is a
-- different number as soon as there is more than one workflow in it.
CREATE FUNCTION "test"."TestGetApprovalWorkflowStagesCount_CountsEveryWorkflowWhenNoneIsNamed" () RETURNS void AS $$
DECLARE
    _SecondWorkflowUUID uuid;
BEGIN
    INSERT INTO "dbo"."ApprovalWorkflows" ("OrganizationUUID", "Name", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Acme'), 'Expenses', 'test')
    RETURNING "ApprovalWorkflowUUID" INTO _SecondWorkflowUUID;

    INSERT INTO "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowUUID", "Name", "SortOrder", "CreatedBy")
    VALUES (_SecondWorkflowUUID, 'Manager', 1, 'test');

    PERFORM "test"."AssertEquals"(
        "dbo"."GetApprovalWorkflowStagesCount"('member', "test"."Fixture"('Organization.Acme')),
        3::bigint,
        'two stages in Redemption plus one in Expenses'
    );
    PERFORM "test"."AssertEquals"(
        "dbo"."GetApprovalWorkflowStagesCount"('member', "test"."Fixture"('Organization.Acme'), _SecondWorkflowUUID),
        1::bigint,
        'naming a workflow should narrow the count to it'
    );
END;
$$ LANGUAGE plpgsql;

-- The draft counted every row in the table, so this was the number it got
-- wrong: another tenant's stages are not part of yours.
CREATE FUNCTION "test"."TestGetApprovalWorkflowStagesCount_IgnoresAnotherOrganizationsStages" () RETURNS void AS $$
DECLARE
    _ElsewhereUUID uuid;
BEGIN
    INSERT INTO "dbo"."ApprovalWorkflows" ("OrganizationUUID", "Name", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Disabled'), 'Redemption', 'test')
    RETURNING "ApprovalWorkflowUUID" INTO _ElsewhereUUID;

    INSERT INTO "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowUUID", "Name", "SortOrder", "CreatedBy")
    VALUES (_ElsewhereUUID, 'Manager', 1, 'test');

    PERFORM "test"."AssertEquals"(
        "dbo"."GetApprovalWorkflowStagesCount"('member', "test"."Fixture"('Organization.Acme')),
        2::bigint,
        'a stage in another organization was counted'
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "test"."TestGetApprovalWorkflowStagesCount_ReturnsZeroForANonMember" () RETURNS void AS $$
BEGIN
    PERFORM "test"."AssertEquals"(
        "dbo"."GetApprovalWorkflowStagesCount"('outsider', "test"."Fixture"('Organization.Acme'), "test"."Fixture"('Workflow.Redemption')),
        0::bigint,
        'GetApprovalWorkflowStagesCount answered a caller who is not in the organization'
    );
END;
$$ LANGUAGE plpgsql;

-- Naming a workflow from elsewhere while being a member here is the narrowing
-- clause and the organization clause pulling in opposite directions; the
-- organization wins.
CREATE FUNCTION "test"."TestGetApprovalWorkflowStagesCount_ReturnsZeroForAWorkflowOutsideTheOrganization" () RETURNS void AS $$
DECLARE
    _ElsewhereUUID uuid;
BEGIN
    INSERT INTO "dbo"."ApprovalWorkflows" ("OrganizationUUID", "Name", "CreatedBy")
    VALUES ("test"."Fixture"('Organization.Disabled'), 'Redemption', 'test')
    RETURNING "ApprovalWorkflowUUID" INTO _ElsewhereUUID;

    INSERT INTO "dbo"."ApprovalWorkflowStages" ("ApprovalWorkflowUUID", "Name", "SortOrder", "CreatedBy")
    VALUES (_ElsewhereUUID, 'Manager', 1, 'test');

    PERFORM "test"."AssertEquals"(
        "dbo"."GetApprovalWorkflowStagesCount"('member', "test"."Fixture"('Organization.Acme'), _ElsewhereUUID),
        0::bigint,
        'a workflow belonging to another organization should count nothing'
    );
END;
$$ LANGUAGE plpgsql;
