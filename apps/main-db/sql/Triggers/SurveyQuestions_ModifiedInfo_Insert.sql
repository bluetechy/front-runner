CREATE TRIGGER "SurveyQuestions_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."SurveyQuestions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
