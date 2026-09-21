CREATE TRIGGER "UserRoles_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."UserRoles" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
