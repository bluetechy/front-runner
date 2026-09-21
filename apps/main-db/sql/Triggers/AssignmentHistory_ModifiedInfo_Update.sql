CREATE TRIGGER "AssignmentHistory_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."AssignmentHistory" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
