ALTER TABLE "dbo"."Attachments" ADD CONSTRAINT "FK_Attachments_Tasks" FOREIGN KEY ("TaskUUID") REFERENCES "dbo"."Tasks" ("TaskUUID");
ALTER TABLE "dbo"."Attachments" ADD CONSTRAINT "FK_Attachments_TaskComments" FOREIGN KEY ("TaskCommentUUID") REFERENCES "dbo"."TaskComments" ("TaskCommentUUID");
