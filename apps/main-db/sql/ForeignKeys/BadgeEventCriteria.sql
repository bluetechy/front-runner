ALTER TABLE "dbo"."BadgeEventCriteria" ADD CONSTRAINT "FK_BadgeEventCriteria_BadgeEvents" FOREIGN KEY ("BadgeEventUUID") REFERENCES "dbo"."BadgeEvents" ("BadgeEventUUID");
ALTER TABLE "dbo"."BadgeEventCriteria" ADD CONSTRAINT "FK_BadgeEventCriteria_Badges" FOREIGN KEY ("BadgeUUID") REFERENCES "dbo"."Badges" ("BadgeUUID");
