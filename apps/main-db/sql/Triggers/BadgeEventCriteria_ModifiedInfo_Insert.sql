CREATE TRIGGER "BadgeEventCriteria_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeEventCriteria" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
