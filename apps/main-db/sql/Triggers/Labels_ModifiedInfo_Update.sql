CREATE TRIGGER "Labels_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Labels" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
