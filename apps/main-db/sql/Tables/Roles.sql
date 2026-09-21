--
-- Named roles an organization defines. The draft called this table UserRoles,
-- but it holds role definitions and nothing that assigns one -- the same shape
-- of gap as Drafts/Tables/Labels.sql. dbo.UserRoles is the assignment.
--
-- This is a THIRD authorization mechanism in the schema, alongside the boolean
-- flags (Users."IsAdmin", UserOrganizations."IsOwner", UserTeams."IsManager")
-- and dbo.ApprovalWorkflowPermissions. Nothing reads it, and no live function
-- consults it -- see SCHEMA-NOTES.md before building on it.
--
CREATE TABLE "dbo"."Roles" (
    "RoleUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "OrganizationUUID" uuid NOT NULL,
    "Name" varchar(64) NOT NULL,
    "Description" text,
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "Roles_NameAndOrganization_UniqueKey" UNIQUE ("OrganizationUUID", "Name")
);
