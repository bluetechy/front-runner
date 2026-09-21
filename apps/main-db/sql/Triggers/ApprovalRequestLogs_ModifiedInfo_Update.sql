CREATE TRIGGER "ApprovalRequestLogs_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."ApprovalRequestLogs" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
