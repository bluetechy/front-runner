CREATE TRIGGER "BadgeReviews_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."BadgeReviews" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
