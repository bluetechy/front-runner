CREATE TRIGGER "EventLog_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."EventLog" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
