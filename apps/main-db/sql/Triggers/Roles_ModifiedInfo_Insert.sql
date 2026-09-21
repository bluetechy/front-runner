CREATE TRIGGER "Roles_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."Roles" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
