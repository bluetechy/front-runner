CREATE TRIGGER "PointMultipliers_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."PointMultipliers" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
