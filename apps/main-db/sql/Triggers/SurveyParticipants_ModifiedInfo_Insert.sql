CREATE TRIGGER "SurveyParticipants_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."SurveyParticipants" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
