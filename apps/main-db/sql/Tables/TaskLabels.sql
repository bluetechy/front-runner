--
-- NOT FROM THE DRAFTS. Drafts/Tables/Labels.sql defines labels and nothing
-- that wears one -- no draft table, function or procedure references it. A
-- label that cannot be attached to anything is inert, so this is the join that
-- makes the table mean something. See SCHEMA-NOTES.md.
--
CREATE TABLE "dbo"."TaskLabels" (
    "TaskUUID" uuid NOT NULL,
    "LabelUUID" uuid NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "TaskLabels_UUIDs_UniqueKey" UNIQUE ("TaskUUID", "LabelUUID")
);
