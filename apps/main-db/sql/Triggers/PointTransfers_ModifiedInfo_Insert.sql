CREATE TRIGGER "PointTransfers_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."PointTransfers" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
