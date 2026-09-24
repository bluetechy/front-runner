CREATE TRIGGER "PasswordResets_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."PasswordResets" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
