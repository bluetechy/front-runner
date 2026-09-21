ALTER TABLE "dbo"."SurveyQuestionOptions" ADD CONSTRAINT "FK_SurveyQuestionOptions_SurveyQuestions" FOREIGN KEY ("SurveyQuestionUUID") REFERENCES "dbo"."SurveyQuestions" ("SurveyQuestionUUID");
