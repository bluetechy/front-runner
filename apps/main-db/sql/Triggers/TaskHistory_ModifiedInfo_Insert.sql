CREATE TRIGGER "TaskHistory_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."TaskHistory" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
