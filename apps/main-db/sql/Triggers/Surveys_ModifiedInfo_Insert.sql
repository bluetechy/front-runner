CREATE TRIGGER "Surveys_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Surveys" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
