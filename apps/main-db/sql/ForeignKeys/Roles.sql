ALTER TABLE "dbo"."Roles" ADD CONSTRAINT "FK_Roles_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
