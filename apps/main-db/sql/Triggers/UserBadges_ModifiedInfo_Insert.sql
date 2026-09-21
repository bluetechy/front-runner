CREATE TRIGGER "UserBadges_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserBadges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
