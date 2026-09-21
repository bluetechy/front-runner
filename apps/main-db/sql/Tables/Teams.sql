CREATE TABLE "dbo"."Teams" (
    "OrganizationUUID" uuid NOT NULL,
    "TeamUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "Name" varchar(64) NOT NULL,
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "Teams_UUIDs_UniqueKey" UNIQUE ("TeamUUID", "OrganizationUUID")
);
