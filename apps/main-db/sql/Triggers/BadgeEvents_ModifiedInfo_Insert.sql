CREATE TRIGGER "BadgeEvents_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeEvents" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
