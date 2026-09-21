CREATE TRIGGER "ApprovalWorkflowPermissions_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."ApprovalWorkflowPermissions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
