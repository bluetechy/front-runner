CREATE TRIGGER "PhoneVerifications_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."PhoneVerifications" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
