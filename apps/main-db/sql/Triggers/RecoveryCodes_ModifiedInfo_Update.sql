CREATE TRIGGER "RecoveryCodes_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."RecoveryCodes" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
