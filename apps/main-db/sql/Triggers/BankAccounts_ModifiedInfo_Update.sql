CREATE TRIGGER "BankAccounts_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BankAccounts" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
