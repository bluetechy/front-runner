CREATE TRIGGER "UserPoints_UserTallies_Update" AFTER UPDATE ON "dbo"."UserPoints" FOR EACH ROW EXECUTE PROCEDURE "dbo"."calculate_tallies"();
