CREATE TRIGGER "ApprovalWorkflows_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."ApprovalWorkflows" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
