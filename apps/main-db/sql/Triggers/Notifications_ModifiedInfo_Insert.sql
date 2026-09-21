CREATE TRIGGER "Notifications_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Notifications" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
