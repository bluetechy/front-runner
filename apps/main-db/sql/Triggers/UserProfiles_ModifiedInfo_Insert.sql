CREATE TRIGGER "UserProfiles_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserProfiles" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
