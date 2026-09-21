CREATE TRIGGER "TaskHistory_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."TaskHistory" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
