CREATE TRIGGER "Users_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Users" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
