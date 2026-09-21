CREATE TRIGGER "ApprovalDecisions_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."ApprovalDecisions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
