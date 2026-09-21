ALTER TABLE "dbo"."AccessControlLists" ADD CONSTRAINT "FK_AccessControlLists_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."AccessControlLists" ADD CONSTRAINT "FK_AccessControlLists_Tasks" FOREIGN KEY ("TaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");
