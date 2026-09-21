CREATE TRIGGER "AssignmentHistory_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."AssignmentHistory" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
