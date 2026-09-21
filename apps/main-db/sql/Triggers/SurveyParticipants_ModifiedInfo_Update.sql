CREATE TRIGGER "SurveyParticipants_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."SurveyParticipants" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
