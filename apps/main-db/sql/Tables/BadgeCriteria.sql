CREATE TABLE "dbo"."BadgeCriteria" (
    "BadgeCriteriaUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "BadgeUUID" uuid,
    "Description" TEXT NOT NULL,
    "BadgeType" VARCHAR(50) NOT NULL, -- Type of criteria (e.g., 'Activity', 'Achievement')
    "Value" INT NOT NULL, -- Value required for criteria completion
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);
