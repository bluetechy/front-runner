--
-- Per-task permission grants. Kept as the draft had it -- a user, a task and a
-- permission type -- rather than generalized to every table, because nothing
-- reads it and a wider design would be guesswork.
--
-- Note what this is not: the live read functions authorize on organization and
-- team membership, and none of them consults this table. See SCHEMA-NOTES.md
-- on the schema now carrying several unconnected authorization mechanisms.
--
CREATE TABLE "dbo"."AccessControlLists" (
    "AccessControlListUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL,
    "TaskUUID" uuid NOT NULL,
    "PermissionType" varchar(50) NOT NULL, -- 'Read', 'Write', 'Admin'
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "AccessControlLists_UUIDs_UniqueKey" UNIQUE ("UserUUID", "TaskUUID", "PermissionType")
);
