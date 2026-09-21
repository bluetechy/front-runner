CREATE TRIGGER "PointMultipliers_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."PointMultipliers" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
