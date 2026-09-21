ALTER TABLE "dbo"."PointLevels" ADD CONSTRAINT "FK_PointLevels_Points" FOREIGN KEY ("PointUUID") REFERENCES "dbo"."Points" ("PointUUID");
