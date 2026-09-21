CREATE TRIGGER "UserRoles_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserRoles" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
