CREATE TRIGGER "Tasks_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Tasks" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
