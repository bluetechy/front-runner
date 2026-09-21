CREATE TRIGGER "UserTeams_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserTeams" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
