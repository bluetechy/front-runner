CREATE TRIGGER "ApprovalWorkflows_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."ApprovalWorkflows" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
