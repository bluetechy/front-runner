CREATE TRIGGER "PhoneVerifications_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."PhoneVerifications" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
