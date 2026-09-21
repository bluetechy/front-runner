CREATE TRIGGER "SharedBadges_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."SharedBadges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
