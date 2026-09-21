CREATE TRIGGER "UserTeams_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserTeams" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
