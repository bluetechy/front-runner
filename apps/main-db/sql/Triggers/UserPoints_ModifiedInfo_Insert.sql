CREATE TRIGGER "UserPoints_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserPoints" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
