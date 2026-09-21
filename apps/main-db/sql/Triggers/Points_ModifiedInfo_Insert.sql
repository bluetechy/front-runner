CREATE TRIGGER "Points_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Points" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
