CREATE TRIGGER "Roadmaps_ModifiedInfo_Update" BEFORE UPDATE ON "dbo"."Roadmaps" FOR EACH ROW EXECUTE PROCEDURE "dbo"."update_modified_info"();
