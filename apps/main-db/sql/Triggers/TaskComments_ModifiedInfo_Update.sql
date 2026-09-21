CREATE TRIGGER "TaskComments_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."TaskComments" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
