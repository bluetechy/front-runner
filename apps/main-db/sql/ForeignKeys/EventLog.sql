ALTER TABLE "dbo"."EventLog" ADD CONSTRAINT "FK_EventLog_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
ALTER TABLE "dbo"."EventLog" ADD CONSTRAINT "FK_EventLog_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
