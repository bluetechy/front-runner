CREATE TRIGGER "ApprovalRequestLogs_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."ApprovalRequestLogs" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
