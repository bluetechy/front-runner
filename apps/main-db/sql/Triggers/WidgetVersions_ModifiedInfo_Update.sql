CREATE TRIGGER "WidgetVersions_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."WidgetVersions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
