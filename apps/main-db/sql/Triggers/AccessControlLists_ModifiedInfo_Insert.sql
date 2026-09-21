CREATE TRIGGER "AccessControlLists_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."AccessControlLists" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
