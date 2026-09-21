CREATE TRIGGER "Organizations_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Organizations" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
