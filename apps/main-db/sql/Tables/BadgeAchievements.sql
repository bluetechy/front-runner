CREATE TABLE "dbo"."BadgeAchievements" (
    "BadgeAchievementUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid,
    "BadgeUUID" uuid,
    "Description" TEXT NOT NULL,
    "MilestoneDate" TIMESTAMPTZ DEFAULT NOW(),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);
