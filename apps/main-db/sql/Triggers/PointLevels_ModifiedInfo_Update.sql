CREATE TRIGGER "PointLevels_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."PointLevels" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
