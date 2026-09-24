CREATE TRIGGER "SecurityEvents_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."SecurityEvents" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
