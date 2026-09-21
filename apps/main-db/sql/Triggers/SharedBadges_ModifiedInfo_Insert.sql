CREATE TRIGGER "SharedBadges_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."SharedBadges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
