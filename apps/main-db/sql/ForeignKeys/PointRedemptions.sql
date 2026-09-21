ALTER TABLE "dbo"."PointRedemptions" ADD CONSTRAINT "FK_PointRedemptions_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."PointRedemptions" ADD CONSTRAINT "FK_PointRedemptions_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
ALTER TABLE "dbo"."PointRedemptions" ADD CONSTRAINT "FK_PointRedemptions_Points" FOREIGN KEY ("PointUUID") REFERENCES "dbo"."Points" ("PointUUID");
