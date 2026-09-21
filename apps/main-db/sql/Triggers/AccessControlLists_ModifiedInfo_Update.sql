CREATE TRIGGER "AccessControlLists_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."AccessControlLists" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
