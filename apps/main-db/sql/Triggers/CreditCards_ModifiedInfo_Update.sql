CREATE TRIGGER "CreditCards_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."CreditCards" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
