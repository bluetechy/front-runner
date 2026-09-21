ALTER TABLE "dbo"."UserBadges" ADD CONSTRAINT constraint_name FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."UserBadges" ADD CONSTRAINT constraint_name FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
ALTER TABLE "dbo"."UserBadges" ADD CONSTRAINT constraint_name FOREIGN KEY ("BadgeUUID") REFERENCES "dbo"."Badges" ("BadgeUUID");
