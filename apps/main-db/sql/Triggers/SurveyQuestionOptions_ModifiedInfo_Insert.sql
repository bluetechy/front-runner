CREATE TRIGGER "SurveyQuestionOptions_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."SurveyQuestionOptions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
