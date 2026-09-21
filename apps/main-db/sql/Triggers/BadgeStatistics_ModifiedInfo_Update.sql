CREATE TRIGGER "BadgeStatistics_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeStatistics" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
