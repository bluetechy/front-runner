ALTER TABLE "dbo"."TaskLabels" ADD CONSTRAINT "FK_TaskLabels_Tasks" FOREIGN KEY ("TaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");
ALTER TABLE "dbo"."TaskLabels" ADD CONSTRAINT "FK_TaskLabels_Labels" FOREIGN KEY ("LabelUUID") REFERENCES "dbo"."Labels" ("LabelUUID");
