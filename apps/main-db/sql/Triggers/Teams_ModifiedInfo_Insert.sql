CREATE TRIGGER "Teams_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Teams" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
