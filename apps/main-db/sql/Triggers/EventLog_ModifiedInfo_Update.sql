CREATE TRIGGER "EventLog_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."EventLog" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
