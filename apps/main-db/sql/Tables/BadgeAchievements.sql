CREATE TABLE "dbo"."BadgeAchievements" (
    "BadgeAchievementUUID" uuid PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    "UserUUID" uuid REFERENCES Users("UserUUID"),
    "BadgeUUID" uuid REFERENCES Badges("BadgeUUID"),
    "Description" TEXT NOT NULL,
    "MilestoneDate" TIMESTAMPTZ DEFAULT NOW(),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" varchar(64) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ,
    "UpdatedBy" varchar(64)
);

CREATE TRIGGER "BadgeAchievements_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeAchievements" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
CREATE TRIGGER "BadgeAchievements_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeAchievements" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
