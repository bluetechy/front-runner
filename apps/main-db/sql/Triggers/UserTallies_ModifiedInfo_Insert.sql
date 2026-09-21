CREATE TRIGGER "UserTallies_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserTallies" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
