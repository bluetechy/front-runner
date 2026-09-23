CREATE TRIGGER "UserEmails_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserEmails" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
