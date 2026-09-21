CREATE TRIGGER "Notifications_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Notifications" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
