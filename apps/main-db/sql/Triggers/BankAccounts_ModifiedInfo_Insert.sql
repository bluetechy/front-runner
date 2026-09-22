CREATE TRIGGER "BankAccounts_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BankAccounts" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
