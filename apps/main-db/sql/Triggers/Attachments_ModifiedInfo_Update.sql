CREATE TRIGGER "Attachments_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Attachments" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
