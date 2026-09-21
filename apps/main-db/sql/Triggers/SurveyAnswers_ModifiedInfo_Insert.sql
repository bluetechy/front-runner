CREATE TRIGGER "SurveyAnswers_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."SurveyAnswers" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
