CREATE TRIGGER "SecurityEvents_Trim_Insert" AFTER INSERT ON "dbo"."SecurityEvents" FOR EACH ROW EXECUTE PROCEDURE "dbo"."trim_security_events"();
