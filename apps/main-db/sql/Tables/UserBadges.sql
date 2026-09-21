CREATE TABLE "dbo"."UserBadges" (
    "UserUUID" uuid NOT NULL,
    "OrganizationUUID" uuid NOT NULL,
    "BadgeUUID" uuid NOT NULL,
    "EarnedAt" TIMESTAMPTZ, -- NULL while the badge is still being worked towards
    "EarnedDescription" text, -- how this user came by it
    "ProgressGoal" integer, -- what ProgressCurrent is counting up to, NULL if the badge has no progress
    "ProgressCurrent" integer NOT NULL DEFAULT 0,
    "RevokedAt" TIMESTAMPTZ, -- set to take an earned badge back without deleting the history
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64),
    CONSTRAINT "UserBadges_UUIDs_UniqueKey" UNIQUE ("UserUUID", "OrganizationUUID", "BadgeUUID")
);
