CREATE TRIGGER "PointTransfers_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."PointTransfers" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
