ALTER TABLE "dbo"."SurveyAnswers" ADD CONSTRAINT "FK_SurveyAnswers_SurveyParticipants" FOREIGN KEY ("SurveyParticipantUUID") REFERENCES "dbo"."SurveyParticipants" ("SurveyParticipantUUID");
ALTER TABLE "dbo"."SurveyAnswers" ADD CONSTRAINT "FK_SurveyAnswers_SurveyQuestions" FOREIGN KEY ("SurveyQuestionUUID") REFERENCES "dbo"."SurveyQuestions" ("SurveyQuestionUUID");
-- Composite on purpose. Pointing at SurveyQuestionOptions by its key alone
-- would let an answer name question A and an option belonging to question B;
-- carrying the question into the reference makes that unstorable. The default
-- MATCH SIMPLE means a free-text answer, whose option is NULL, skips the check.
ALTER TABLE "dbo"."SurveyAnswers" ADD CONSTRAINT "FK_SurveyAnswers_SurveyQuestionOptions" FOREIGN KEY ("SurveyQuestionOptionUUID", "SurveyQuestionUUID") REFERENCES "dbo"."SurveyQuestionOptions" ("SurveyQuestionOptionUUID", "SurveyQuestionUUID");
