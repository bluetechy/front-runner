ALTER TABLE "dbo"."Notifications" ADD CONSTRAINT "FK_Notifications_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."Notifications" ADD CONSTRAINT "FK_Notifications_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
ALTER TABLE "dbo"."Notifications" ADD CONSTRAINT "FK_Notifications_Tasks" FOREIGN KEY ("TaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");
