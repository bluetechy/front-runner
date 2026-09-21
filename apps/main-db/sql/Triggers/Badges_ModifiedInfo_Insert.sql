CREATE TRIGGER "Badges_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Badges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
