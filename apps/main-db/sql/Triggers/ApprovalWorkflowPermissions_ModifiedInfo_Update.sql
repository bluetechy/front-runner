CREATE TRIGGER "ApprovalWorkflowPermissions_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."ApprovalWorkflowPermissions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
