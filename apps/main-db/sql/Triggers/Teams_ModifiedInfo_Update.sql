CREATE TRIGGER "Teams_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Teams" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
