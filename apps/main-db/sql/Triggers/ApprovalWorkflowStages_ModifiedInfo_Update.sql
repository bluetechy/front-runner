CREATE TRIGGER "ApprovalWorkflowStages_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."ApprovalWorkflowStages" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
