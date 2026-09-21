ALTER TABLE "dbo"."SurveyParticipants" ADD CONSTRAINT "FK_SurveyParticipants_Surveys" FOREIGN KEY ("SurveyUUID") REFERENCES "dbo"."Surveys" ("SurveyUUID");
ALTER TABLE "dbo"."SurveyParticipants" ADD CONSTRAINT "FK_SurveyParticipants_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
