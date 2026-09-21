--
-- Surveys are the one draft area with no logic behind them at all: not one of
-- the drafts' 169 functions and procedures references a survey table. The five
-- tables here are a design rather than a migration. See SCHEMA-NOTES.md.
--
CREATE TABLE "dbo"."Surveys" (
    "SurveyUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "OrganizationUUID" uuid NOT NULL,
    "Name" varchar(64) NOT NULL,
    "Description" text,
    "OpensAt" TIMESTAMPTZ,
    "ClosesAt" TIMESTAMPTZ,
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);
