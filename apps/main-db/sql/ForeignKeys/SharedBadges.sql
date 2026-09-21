ALTER TABLE "dbo"."SharedBadges" ADD CONSTRAINT "FK_SharedBadges_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."SharedBadges" ADD CONSTRAINT "FK_SharedBadges_Badges" FOREIGN KEY ("BadgeUUID") REFERENCES "dbo"."Badges" ("BadgeUUID");
ALTER TABLE "dbo"."SharedBadges" ADD CONSTRAINT "FK_SharedBadges_Users_SharedWithUserUUID" FOREIGN KEY ("SharedWithUserUUID") REFERENCES "dbo"."Users" ("UserUUID");
