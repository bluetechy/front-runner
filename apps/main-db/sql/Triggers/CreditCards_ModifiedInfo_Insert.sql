CREATE TRIGGER "CreditCards_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."CreditCards" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
