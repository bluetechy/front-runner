CREATE TRIGGER "PointLevels_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."PointLevels" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
