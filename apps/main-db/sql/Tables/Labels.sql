--
-- Labels belong to an organization, like dbo.Teams. What they are attached to
-- is dbo.TaskLabels.
--
CREATE TABLE "dbo"."Labels" (
    "LabelUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "OrganizationUUID" uuid NOT NULL,
    "Name" varchar(64) NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "Labels_NameAndOrganization_UniqueKey" UNIQUE ("OrganizationUUID", "Name")
);
