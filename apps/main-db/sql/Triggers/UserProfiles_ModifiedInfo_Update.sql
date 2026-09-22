CREATE TRIGGER "UserProfiles_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserProfiles" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
