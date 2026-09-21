ALTER TABLE "dbo"."Checklists" ADD CONSTRAINT "FK_Checklists_Tasks" FOREIGN KEY ("TaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");
