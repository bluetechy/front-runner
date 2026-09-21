--
-- The template: a named approval process belonging to an organization. The
-- drafts called this ApprovalProcesses and never wrote the table, which is why
-- ApprovalWorkflowStages had no parent. See SCHEMA-NOTES.md.
--
CREATE TABLE "dbo"."ApprovalWorkflows" (
    "ApprovalWorkflowUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "OrganizationUUID" uuid NOT NULL,
    "Name" varchar(64) NOT NULL,
    "Description" text,
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "ApprovalWorkflows_NameAndOrganization_UniqueKey" UNIQUE ("OrganizationUUID", "Name")
);
