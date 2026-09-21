CREATE TRIGGER "TaskComments_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."TaskComments" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
