CREATE TABLE "dbo"."BadgeStatistics" (
    "BadgeStatisticUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "BadgeUUID" uuid,
    "UsersEarned" INT, -- Number of users who have earned this badge
    "LatestEarnings" INT, -- Number of recent badge earnings
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);
