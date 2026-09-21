CREATE TRIGGER "BadgeEventCriteria_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeEventCriteria" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
