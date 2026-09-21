CREATE TRIGGER "UserPointLevels_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserPointLevels" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
