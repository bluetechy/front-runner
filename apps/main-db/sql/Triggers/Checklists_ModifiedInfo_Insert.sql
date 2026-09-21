CREATE TRIGGER "Checklists_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Checklists" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
