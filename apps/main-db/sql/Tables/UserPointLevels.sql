--
-- Which levels a user has reached, and when. One row per level rather than a
-- current-level pointer, so the history survives a balance going back down.
-- The level names its own point type, so this table does not repeat it.
--
CREATE TABLE "dbo"."UserPointLevels" (
    "UserPointLevelUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid NOT NULL,
    "OrganizationUUID" uuid NOT NULL,
    "PointLevelUUID" uuid NOT NULL,
    "ReachedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "UserPointLevels_UUIDs_UniqueKey" UNIQUE ("UserUUID", "OrganizationUUID", "PointLevelUUID")
);
