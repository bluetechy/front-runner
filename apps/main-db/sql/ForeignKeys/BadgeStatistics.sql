ALTER TABLE "dbo"."BadgeStatistics" ADD CONSTRAINT "FK_BadgeStatistics_Badges" FOREIGN KEY ("BadgeUUID") REFERENCES "dbo"."Badges" ("BadgeUUID");
