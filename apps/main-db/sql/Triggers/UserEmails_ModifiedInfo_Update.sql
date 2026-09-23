CREATE TRIGGER "UserEmails_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserEmails" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
