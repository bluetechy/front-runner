CREATE TRIGGER "ApprovalRequests_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."ApprovalRequests" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
