CREATE TRIGGER "SurveyQuestions_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."SurveyQuestions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
