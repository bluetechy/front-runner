ALTER TABLE "dbo"."TaskHistory" ADD CONSTRAINT "FK_TaskHistory_Tasks" FOREIGN KEY ("TaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");
ALTER TABLE "dbo"."TaskHistory" ADD CONSTRAINT "FK_TaskHistory_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
