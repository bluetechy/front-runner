CREATE TRIGGER "BadgeEvents_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeEvents" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
