CREATE TRIGGER "TaskDependencies_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."TaskDependencies" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
