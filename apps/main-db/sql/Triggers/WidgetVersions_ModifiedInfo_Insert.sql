CREATE TRIGGER "WidgetVersions_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."WidgetVersions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
