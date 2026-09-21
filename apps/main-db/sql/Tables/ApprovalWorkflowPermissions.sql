--
-- Who may decide at a stage. Nothing enforces it -- dbo.ApprovalDecisions will
-- accept a decision from anybody, so whatever records one has to check here
-- first. See SCHEMA-NOTES.md.
--
CREATE TABLE "dbo"."ApprovalWorkflowPermissions" (
    "ApprovalWorkflowPermissionUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "ApprovalWorkflowStageUUID" uuid NOT NULL,
    "UserUUID" uuid NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "ApprovalWorkflowPermissions_UUIDs_UniqueKey" UNIQUE ("ApprovalWorkflowStageUUID", "UserUUID")
);
