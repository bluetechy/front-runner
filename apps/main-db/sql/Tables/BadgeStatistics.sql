CREATE TABLE "dbo"."BadgeStatistics" (
    "BadgeStatisticUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "BadgeUUID" uuid REFERENCES Badges("BadgeUUID"),
    "UsersEarned" INT, -- Number of users who have earned this badge
    "LatestEarnings" INT, -- Number of recent badge earnings
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

CREATE TRIGGER "BadgeStatistics_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeStatistics" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "BadgeStatistics_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeStatistics" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
