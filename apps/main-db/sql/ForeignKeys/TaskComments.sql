ALTER TABLE "dbo"."TaskComments" ADD CONSTRAINT "FK_TaskComments_Tasks" FOREIGN KEY ("TaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");
ALTER TABLE "dbo"."TaskComments" ADD CONSTRAINT "FK_TaskComments_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
