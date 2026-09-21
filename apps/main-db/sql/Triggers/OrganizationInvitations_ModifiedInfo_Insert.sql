CREATE TRIGGER "OrganizationInvitations_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."OrganizationInvitations" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
