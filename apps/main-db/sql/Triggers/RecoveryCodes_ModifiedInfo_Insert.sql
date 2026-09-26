CREATE TRIGGER "RecoveryCodes_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."RecoveryCodes" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
