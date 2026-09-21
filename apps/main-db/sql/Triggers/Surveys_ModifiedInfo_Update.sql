CREATE TRIGGER "Surveys_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Surveys" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
