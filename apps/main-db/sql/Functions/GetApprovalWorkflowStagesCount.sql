--
-- How many stages a request has to pass through. With no workflow named, how
-- many the organization has defined across all of them.
--
-- From GetApprovalWorkflowStagesCount, which counted every row in
-- ApprovalWorkflowStages in the database -- no organization, and no workflow
-- either, because at the time the drafts had not written the parent table. A
-- count across every tenant is not a number anybody can use.
--
-- A caller who is not in the organization sees 0, the same nothing
-- dbo.GetBadgeGroups gives them. 0 is also what an empty workflow returns, so
-- it does not distinguish "not yours" from "not built yet" -- neither is a
-- workflow you can send a request into.
--
CREATE FUNCTION "dbo"."GetApprovalWorkflowStagesCount" (
    _LoginName varchar(64),
    _OrganizationUUID uuid,
    _ApprovalWorkflowUUID uuid DEFAULT NULL
) RETURNS bigint AS $$
    DECLARE
        _IsMemberOfOrganization boolean = "dbo"."IsMemberOfOrganization"(_LoginName, _OrganizationUUID);
        _Count bigint;
    BEGIN
        IF _IsMemberOfOrganization IS NOT true THEN
            RETURN 0;
        END IF;

        SELECT count(*) INTO _Count
        FROM "dbo"."ApprovalWorkflowStages"
            INNER JOIN "dbo"."ApprovalWorkflows" ON ("ApprovalWorkflows"."ApprovalWorkflowUUID" = "ApprovalWorkflowStages"."ApprovalWorkflowUUID")
        WHERE "ApprovalWorkflows"."OrganizationUUID" = _OrganizationUUID
            AND (_ApprovalWorkflowUUID IS NULL OR "ApprovalWorkflowStages"."ApprovalWorkflowUUID" = _ApprovalWorkflowUUID);

        RETURN _Count;
    END;
$$ LANGUAGE plpgsql;
