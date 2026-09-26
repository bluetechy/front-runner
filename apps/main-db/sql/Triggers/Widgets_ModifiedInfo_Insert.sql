CREATE TRIGGER "Widgets_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Widgets" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
