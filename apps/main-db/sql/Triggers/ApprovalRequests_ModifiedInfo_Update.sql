CREATE TRIGGER "ApprovalRequests_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."ApprovalRequests" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
