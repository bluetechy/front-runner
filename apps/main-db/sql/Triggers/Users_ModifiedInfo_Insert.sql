CREATE TRIGGER "Users_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Users" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
