--
-- Tiers a balance passes through, per point type. A definition table, so it is
-- global like dbo.Points and dbo.Badges -- the per-user half is
-- dbo.UserPointLevels.
--
CREATE TABLE "dbo"."PointLevels" (
    "PointLevelUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "PointUUID" uuid NOT NULL,
    "Name" varchar(64) NOT NULL,
    "Description" text, -- what reaching this level earns the user
    "MinimumAmount" decimal(19,4) NOT NULL, -- tally at or above which the user holds this level
    "IsEnabled" boolean NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "PointLevels_NameAndPoint_UniqueKey" UNIQUE ("PointUUID", "Name")
);
