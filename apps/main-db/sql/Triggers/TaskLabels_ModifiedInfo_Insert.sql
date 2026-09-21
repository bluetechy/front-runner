CREATE TRIGGER "TaskLabels_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."TaskLabels" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
