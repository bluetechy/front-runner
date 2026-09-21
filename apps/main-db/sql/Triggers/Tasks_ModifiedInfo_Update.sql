CREATE TRIGGER "Tasks_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Tasks" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
