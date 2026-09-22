ALTER TABLE "dbo"."Notifications" ADD CONSTRAINT "FK_Notifications_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."Notifications" ADD CONSTRAINT "FK_Notifications_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
ALTER TABLE "dbo"."Notifications" ADD CONSTRAINT "FK_Notifications_Tasks" FOREIGN KEY ("TaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");
-- Two foreign keys to the same table, so both carry the column they are on:
-- "UserUUID" is who is being told and "ActorUUID" is who caused it.
ALTER TABLE "dbo"."Notifications" ADD CONSTRAINT "FK_Notifications_Users_ActorUUID" FOREIGN KEY ("ActorUUID") REFERENCES "dbo"."Users" ("UserUUID");
