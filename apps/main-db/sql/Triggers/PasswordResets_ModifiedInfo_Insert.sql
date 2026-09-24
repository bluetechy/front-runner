CREATE TRIGGER "PasswordResets_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."PasswordResets" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
