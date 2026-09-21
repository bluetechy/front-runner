CREATE TRIGGER "BadgeGroupRelationships_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeGroupRelationships" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
