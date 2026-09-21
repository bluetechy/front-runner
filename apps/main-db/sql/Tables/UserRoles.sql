--
-- NOT FROM THE DRAFTS, in the sense that the draft file of this name defines
-- roles rather than assigning them. This is the join that makes dbo.Roles mean
-- something, the same way dbo.TaskLabels does for dbo.Labels.
--
-- The role carries the organization, so this table does not repeat it.
--
CREATE TABLE "dbo"."UserRoles" (
    "UserUUID" uuid NOT NULL,
    "RoleUUID" uuid NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "UserRoles_UUIDs_UniqueKey" UNIQUE ("UserUUID", "RoleUUID")
);
