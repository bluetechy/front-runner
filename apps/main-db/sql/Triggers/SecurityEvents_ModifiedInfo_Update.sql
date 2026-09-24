CREATE TRIGGER "SecurityEvents_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."SecurityEvents" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
