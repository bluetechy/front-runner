ALTER TABLE "dbo"."Surveys" ADD CONSTRAINT "FK_Surveys_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
