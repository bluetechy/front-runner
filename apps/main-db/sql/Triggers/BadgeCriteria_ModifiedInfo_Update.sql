CREATE TRIGGER "BadgeCriteria_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeCriteria" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
