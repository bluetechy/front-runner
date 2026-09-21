CREATE TRIGGER "Badges_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Badges" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
