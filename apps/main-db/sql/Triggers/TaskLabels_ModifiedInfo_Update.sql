CREATE TRIGGER "TaskLabels_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."TaskLabels" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
