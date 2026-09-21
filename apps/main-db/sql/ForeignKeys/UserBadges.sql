ALTER TABLE "dbo"."UserBadges" ADD CONSTRAINT "FK_UserBadges_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."UserBadges" ADD CONSTRAINT "FK_UserBadges_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
ALTER TABLE "dbo"."UserBadges" ADD CONSTRAINT "FK_UserBadges_Badges" FOREIGN KEY ("BadgeUUID") REFERENCES "dbo"."Badges" ("BadgeUUID");
