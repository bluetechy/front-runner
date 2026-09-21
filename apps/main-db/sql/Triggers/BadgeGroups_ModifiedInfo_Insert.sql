CREATE TRIGGER "BadgeGroups_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."BadgeGroups" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
