CREATE TRIGGER "UserTallies_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserTallies" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
