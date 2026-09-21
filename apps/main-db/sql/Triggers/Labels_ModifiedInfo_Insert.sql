CREATE TRIGGER "Labels_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Labels" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
