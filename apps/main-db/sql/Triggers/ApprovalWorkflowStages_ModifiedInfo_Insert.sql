CREATE TRIGGER "ApprovalWorkflowStages_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."ApprovalWorkflowStages" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
