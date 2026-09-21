CREATE TRIGGER "UserOrganizations_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserOrganizations" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
