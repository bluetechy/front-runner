ALTER TABLE "dbo"."UserPointLevels" ADD CONSTRAINT "FK_UserPointLevels_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."UserPointLevels" ADD CONSTRAINT "FK_UserPointLevels_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
ALTER TABLE "dbo"."UserPointLevels" ADD CONSTRAINT "FK_UserPointLevels_PointLevels" FOREIGN KEY ("PointLevelUUID") REFERENCES "dbo"."PointLevels" ("PointLevelUUID");
