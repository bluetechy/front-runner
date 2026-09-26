CREATE TRIGGER "Widgets_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Widgets" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
