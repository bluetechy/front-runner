CREATE TRIGGER "UserPoints_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."UserPoints" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
