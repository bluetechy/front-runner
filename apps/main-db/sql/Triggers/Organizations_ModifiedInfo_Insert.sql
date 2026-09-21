CREATE TRIGGER "Organizations_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Organizations" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
