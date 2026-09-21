CREATE TRIGGER "BadgeGroupRelationships_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeGroupRelationships" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
