ALTER TABLE "dbo"."ApprovalWorkflows" ADD CONSTRAINT "FK_ApprovalWorkflows_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
