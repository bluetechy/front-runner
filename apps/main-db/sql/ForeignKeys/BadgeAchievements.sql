ALTER TABLE "dbo"."BadgeAchievements" ADD CONSTRAINT "FK_BadgeAchievements_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."BadgeAchievements" ADD CONSTRAINT "FK_BadgeAchievements_Badges" FOREIGN KEY ("BadgeUUID") REFERENCES "dbo"."Badges" ("BadgeUUID");
