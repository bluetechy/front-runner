CREATE TRIGGER "UserOrganizations_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserOrganizations" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
