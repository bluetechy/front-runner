CREATE TRIGGER "TaskDependencies_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."TaskDependencies" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
