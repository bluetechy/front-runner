CREATE TRIGGER "BadgeGroups_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeGroups" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
