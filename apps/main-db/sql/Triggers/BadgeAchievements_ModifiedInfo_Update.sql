CREATE TRIGGER "BadgeAchievements_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeAchievements" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
