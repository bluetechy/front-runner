CREATE TRIGGER "BadgeCategories_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeCategories" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
