CREATE TRIGGER "PointRedemptions_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."PointRedemptions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
