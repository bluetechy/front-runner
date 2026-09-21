CREATE TRIGGER "Attachments_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Attachments" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
