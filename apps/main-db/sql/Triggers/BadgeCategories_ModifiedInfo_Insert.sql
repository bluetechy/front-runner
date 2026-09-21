CREATE TRIGGER "BadgeCategories_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeCategories" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
