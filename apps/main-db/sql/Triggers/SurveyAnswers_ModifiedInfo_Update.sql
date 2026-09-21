CREATE TRIGGER "SurveyAnswers_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."SurveyAnswers" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
