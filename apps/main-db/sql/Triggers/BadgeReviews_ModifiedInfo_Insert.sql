CREATE TRIGGER "BadgeReviews_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeReviews" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
