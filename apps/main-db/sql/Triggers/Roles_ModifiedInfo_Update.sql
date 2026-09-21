CREATE TRIGGER "Roles_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Roles" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
