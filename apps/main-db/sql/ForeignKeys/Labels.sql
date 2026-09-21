ALTER TABLE "dbo"."Labels" ADD CONSTRAINT "FK_Labels_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
