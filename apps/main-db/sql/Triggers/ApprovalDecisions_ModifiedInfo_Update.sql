CREATE TRIGGER "ApprovalDecisions_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."ApprovalDecisions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
