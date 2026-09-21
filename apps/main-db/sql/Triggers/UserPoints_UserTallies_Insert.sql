CREATE TRIGGER "UserPoints_UserTallies_Insert" AFTER INSERT ON "dbo"."UserPoints" FOR EACH ROW EXECUTE PROCEDURE "dbo"."calculate_tallies"();
