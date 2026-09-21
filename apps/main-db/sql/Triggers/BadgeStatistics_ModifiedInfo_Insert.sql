CREATE TRIGGER "BadgeStatistics_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeStatistics" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
