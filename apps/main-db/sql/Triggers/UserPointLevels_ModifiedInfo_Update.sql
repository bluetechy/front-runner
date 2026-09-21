CREATE TRIGGER "UserPointLevels_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserPointLevels" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
