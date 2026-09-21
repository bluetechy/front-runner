CREATE TRIGGER "UserBadges_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserBadges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
