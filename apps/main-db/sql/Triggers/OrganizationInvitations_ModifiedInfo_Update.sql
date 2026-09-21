CREATE TRIGGER "OrganizationInvitations_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."OrganizationInvitations" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
