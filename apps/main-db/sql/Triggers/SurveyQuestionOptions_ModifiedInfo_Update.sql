CREATE TRIGGER "SurveyQuestionOptions_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."SurveyQuestionOptions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
