CREATE TRIGGER "PointRedemptions_ModifiedInfo_Insert" BEFORE INSERT ON "dbo"."PointRedemptions" FOR EACH ROW EXECUTE PROCEDURE "dbo"."insert_modified_info"();
