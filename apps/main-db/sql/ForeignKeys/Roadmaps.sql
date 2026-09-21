ALTER TABLE "dbo"."Roadmaps" ADD CONSTRAINT "FK_Roadmaps_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
