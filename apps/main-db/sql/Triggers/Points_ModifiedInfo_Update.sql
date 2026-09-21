CREATE TRIGGER "Points_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Points" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
