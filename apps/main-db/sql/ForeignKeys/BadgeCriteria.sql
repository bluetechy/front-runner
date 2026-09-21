ALTER TABLE "dbo"."BadgeCriteria" ADD CONSTRAINT "FK_BadgeCriteria_Badges" FOREIGN KEY ("BadgeUUID") REFERENCES "dbo"."Badges" ("BadgeUUID");
