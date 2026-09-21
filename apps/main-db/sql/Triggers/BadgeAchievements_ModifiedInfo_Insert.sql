CREATE TRIGGER "BadgeAchievements_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeAchievements" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
